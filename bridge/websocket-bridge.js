// NeuroArt - WebSocket Bridge for DSI-Streamer
// Receives EEG data from DSI-Streamer via TCP or OSC
// Broadcasts to web clients via WebSocket
// Uses FFT-based Power Spectral Density for accurate frequency band analysis

const net = require('net');
const WebSocket = require('ws');
const FFT = require('fft.js');

// Optional: only load node-osc if OSC mode is used
let osc;
try { osc = require('node-osc'); } catch (e) { /* OSC not installed, TCP-only mode */ }

// Configuration
const CONFIG = {
    // WebSocket server (browser clients connect here)
    wsPort: 8080,

    // DSI-Streamer connection mode: 'tcp' or 'osc'
    // TCP mode: Bridge connects as a TCP client to DSI-Streamer's TCP server
    // OSC mode: Bridge listens for incoming UDP/OSC packets
    connectionMode: 'tcp',

    // DSI-Streamer settings
    dsi: {
        host: 'localhost',

        // TCP mode settings
        // DSI-Streamer acts as a TCP server on this port.
        // This should match the "Server Output" port in DSI-Streamer's TCP/IP tab.
        tcpPort: 8944,

        // OSC mode settings (legacy, if your DSI-Streamer uses OSC output)
        oscServerOutport: 8944,
        oscClientInport: 8844
    },

    // Signal processing
    samplingRate: 300, // Hz (typical for DSI-7)
    updateRate: 30,    // Hz (send to clients)

    // FFT Configuration
    // Set fftSize based on your use case:
    //   512  → ~1.7s latency, 0.586 Hz resolution (best for real-time art)
    //   1024 → ~3.4s latency, 0.293 Hz resolution (best for neurofeedback precision)
    fftSize: 512,

    // Band frequency ranges (Hz)
    bands: {
        delta: { min: 0.5, max: 4 },
        theta: { min: 4, max: 8 },
        alpha: { min: 8, max: 13 },
        beta: { min: 13, max: 30 },
        gamma: { min: 30, max: 100 }
    },

    // Motor spike detection
    spikeDetection: {
        baselineAlpha: 0.02,  // EMA adaptation rate for baseline
        threshold: 2.5,       // Multiplier above baseline to trigger spike
        decay: 0.95           // Per-broadcast spike decay rate
    },

    // TCP reconnection
    tcp: {
        reconnectInterval: 3000, // ms between reconnect attempts
        maxReconnectAttempts: 0  // 0 = unlimited
    },

    // Debug: log raw incoming data for troubleshooting
    debugLogRawData: false
};

// ============================================
// FFT Engine Setup
// ============================================

const fft = new FFT(CONFIG.fftSize);

// Pre-compute Hann window coefficients for spectral leakage reduction
const hannWindow = new Float64Array(CONFIG.fftSize);
for (let i = 0; i < CONFIG.fftSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (CONFIG.fftSize - 1)));
}

// Pre-compute frequency bin → band mapping
const freqResolution = CONFIG.samplingRate / CONFIG.fftSize;
const binBandMap = {};

Object.keys(CONFIG.bands).forEach(band => {
    const { min, max } = CONFIG.bands[band];
    const startBin = Math.max(1, Math.ceil(min / freqResolution));
    const endBin = Math.min(CONFIG.fftSize / 2 - 1, Math.floor(max / freqResolution));
    binBandMap[band] = { startBin, endBin };
});

console.log('FFT Configuration:');
console.log(`  FFT size: ${CONFIG.fftSize} samples`);
console.log(`  Frequency resolution: ${freqResolution.toFixed(3)} Hz/bin`);
console.log(`  Window duration: ${(CONFIG.fftSize / CONFIG.samplingRate).toFixed(2)}s`);
console.log('  Band → Bin mapping:');
Object.keys(binBandMap).forEach(band => {
    const { startBin, endBin } = binBandMap[band];
    const fLow = (startBin * freqResolution).toFixed(1);
    const fHigh = (endBin * freqResolution).toFixed(1);
    console.log(`    ${band}: bins ${startBin}–${endBin} (${fLow}–${fHigh} Hz)`);
});

// ============================================
// Global State
// ============================================

let wsClients = new Set();
let eegBuffer = [];
let bandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
let motorSpike = 0;
let baselinePower = 0;
let baselineInitialized = false;

// DSI-Streamer TCP connection state
let tcpClient = null;
let tcpConnected = false;
let tcpReconnectAttempts = 0;
let tcpReconnectTimer = null;
let tcpBytesReceived = 0;
let tcpPacketsParsed = 0;
let tcpFirstDataReceived = false;

// TCP binary parser state
let tcpBuffer = Buffer.alloc(0);

// DSI-Streamer protocol constants
const DSI_HEADER_SIZE = 12;
const DSI_PACKET_START = '@ABCD';
const DSI_PACKET_TYPE_EEG = 1;
const DSI_PACKET_TYPE_EVENT = 5;

// ============================================
// WebSocket Server (for browser clients)
// ============================================

const wss = new WebSocket.Server({ port: CONFIG.wsPort });

wss.on('connection', (ws) => {
    console.log('[WS] Browser client connected');
    wsClients.add(ws);

    ws.send(JSON.stringify({
        type: 'status',
        message: 'Connected to NeuroArt bridge',
        connectionMode: CONFIG.connectionMode,
        dsiConnected: tcpConnected,
        fftSize: CONFIG.fftSize,
        freqResolution: freqResolution,
        timestamp: Date.now()
    }));

    ws.on('close', () => {
        console.log('[WS] Browser client disconnected');
        wsClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('[WS] Client error:', error.message);
        wsClients.delete(ws);
    });
});

console.log(`[WS] WebSocket server listening on port ${CONFIG.wsPort}`);

// ============================================
// DSI-Streamer TCP Client
// ============================================

/**
 * Connect to DSI-Streamer's TCP server.
 *
 * DSI-Streamer Protocol:
 *   - DSI-Streamer runs a TCP server (you set the port in its TCP/IP tab)
 *   - Our bridge connects as a TCP client
 *   - Data arrives as binary packets with a 12-byte header:
 *       Bytes 0-4:  "@ABCD" (ASCII, packet delimiter)
 *       Byte  5:    Packet Type (1=EEG data, 5=Event)
 *       Bytes 6-7:  Payload Length (big-endian uint16)
 *       Bytes 8-11: Packet Number (big-endian uint32)
 *   - EEG payload: sequence of big-endian 32-bit floats (one per channel)
 */
function connectTCP() {
    if (tcpClient) {
        tcpClient.destroy();
        tcpClient = null;
    }

    const port = CONFIG.dsi.tcpPort;
    const host = CONFIG.dsi.host;

    console.log(`[TCP] Connecting to DSI-Streamer at ${host}:${port}...`);

    tcpClient = new net.Socket();

    // Enable TCP keepalive to prevent OS-level idle disconnects
    tcpClient.setKeepAlive(true, 5000);

    tcpClient.connect(port, host, () => {
        console.log(`[TCP] ✓ Connected to DSI-Streamer at ${host}:${port}`);
        console.log(`[TCP] Waiting for EEG data... (make sure DSI-Streamer is streaming)`);
        tcpConnected = true;
        tcpReconnectAttempts = 0;
        tcpBytesReceived = 0;
        tcpPacketsParsed = 0;
        tcpFirstDataReceived = false;
        tcpBuffer = Buffer.alloc(0);

        // Disable the connect timeout once connected — DSI-Streamer may not
        // start streaming until the user presses Record/Start in the DSI app.
        tcpClient.setTimeout(0);
    });

    tcpClient.on('data', (data) => {
        tcpBytesReceived += data.length;

        // Log the very first data arrival — confirms DSI-Streamer is streaming
        if (!tcpFirstDataReceived) {
            tcpFirstDataReceived = true;
            console.log(`[TCP] ✓ First data received! (${data.length} bytes)`);
            // Log the first 40 bytes as hex for protocol debugging
            const preview = data.slice(0, Math.min(40, data.length));
            console.log(`[TCP] Raw preview: ${preview.toString('hex').match(/../g).join(' ')}`);
            console.log(`[TCP] ASCII preview: ${preview.toString('ascii').replace(/[^\x20-\x7e]/g, '.')}`);
        }

        // Append incoming data to the parse buffer
        tcpBuffer = Buffer.concat([tcpBuffer, data]);

        if (CONFIG.debugLogRawData && tcpBuffer.length > 0) {
            console.log(`[TCP] Received ${data.length} bytes (buffer: ${tcpBuffer.length})`);
        }

        // Parse as many complete packets as available
        parseDSIPackets();
    });

    tcpClient.on('close', () => {
        console.log('[TCP] Connection closed');
        tcpConnected = false;
        scheduleReconnect();
    });

    tcpClient.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
            console.log(`[TCP] Connection refused — is DSI-Streamer running with TCP enabled on port ${port}?`);
        } else {
            console.error('[TCP] Error:', error.message);
        }
        tcpConnected = false;
    });

    tcpClient.on('timeout', () => {
        // This only fires during initial connection (before connect callback)
        // because we call setTimeout(0) after connecting.
        console.log('[TCP] Connection timed out (could not reach DSI-Streamer)');
        tcpClient.destroy();
    });

    // 15s timeout ONLY for the initial TCP handshake.
    // Once connected, this is disabled in the 'connect' handler above.
    tcpClient.setTimeout(15000);
}

/**
 * Schedule a TCP reconnection attempt
 */
function scheduleReconnect() {
    if (tcpReconnectTimer) return;

    if (CONFIG.tcp.maxReconnectAttempts > 0 &&
        tcpReconnectAttempts >= CONFIG.tcp.maxReconnectAttempts) {
        console.log('[TCP] Max reconnect attempts reached. Stopping.');
        return;
    }

    tcpReconnectAttempts++;
    const delay = CONFIG.tcp.reconnectInterval;
    console.log(`[TCP] Reconnecting in ${delay / 1000}s (attempt ${tcpReconnectAttempts})...`);

    tcpReconnectTimer = setTimeout(() => {
        tcpReconnectTimer = null;
        connectTCP();
    }, delay);
}

// ============================================
// DSI-Streamer Binary Protocol Parser
// ============================================

/**
 * Parse DSI-Streamer binary packets from the TCP buffer.
 *
 * Packet structure:
 *   [0..4]   "@ABCD"        (5 bytes, ASCII)
 *   [5]      Packet Type    (1 byte, uint8: 1=EEG, 5=Event)
 *   [6..7]   Payload Length (2 bytes, big-endian uint16)
 *   [8..11]  Packet Number  (4 bytes, big-endian uint32)
 *   [12..]   Payload        (Payload Length bytes)
 *
 * EEG Payload (type 1):
 *   Sequence of big-endian IEEE 754 float32 values, one per channel.
 */
function parseDSIPackets() {
    while (tcpBuffer.length >= DSI_HEADER_SIZE) {
        // 1. Find the @ABCD delimiter to synchronize
        const delimIdx = findDelimiter(tcpBuffer);

        if (delimIdx === -1) {
            // No delimiter found — discard all but last 4 bytes (partial delimiter)
            if (tcpBuffer.length > 4) {
                tcpBuffer = tcpBuffer.slice(-4);
            }
            return;
        }

        if (delimIdx > 0) {
            // Discard bytes before the delimiter (lost sync recovery)
            console.log(`[TCP] Skipped ${delimIdx} bytes to re-sync`);
            tcpBuffer = tcpBuffer.slice(delimIdx);
        }

        // 2. Do we have the full 12-byte header?
        if (tcpBuffer.length < DSI_HEADER_SIZE) return;

        // 3. Parse header
        const packetType = tcpBuffer.readUInt8(5);
        const payloadLength = tcpBuffer.readUInt16BE(6);
        const packetNumber = tcpBuffer.readUInt32BE(8);
        const totalPacketSize = DSI_HEADER_SIZE + payloadLength;

        // 4. Do we have the full packet?
        if (tcpBuffer.length < totalPacketSize) return;

        // 5. Extract payload
        const payload = tcpBuffer.slice(DSI_HEADER_SIZE, totalPacketSize);

        // 6. Advance buffer past this packet
        tcpBuffer = tcpBuffer.slice(totalPacketSize);

        // 7. Process by type
        if (packetType === DSI_PACKET_TYPE_EEG) {
            processEEGPacket(payload, packetNumber);
        } else if (packetType === DSI_PACKET_TYPE_EVENT) {
            processEventPacket(payload, packetNumber);
        } else {
            if (CONFIG.debugLogRawData) {
                console.log(`[TCP] Unknown packet type ${packetType}, length ${payloadLength}`);
            }
        }
    }
}

/**
 * Find the @ABCD delimiter in a buffer
 * @param {Buffer} buf - Buffer to search
 * @returns {number} Index of delimiter start, or -1
 */
function findDelimiter(buf) {
    const target = Buffer.from(DSI_PACKET_START, 'ascii');
    for (let i = 0; i <= buf.length - target.length; i++) {
        if (buf[i] === target[0] &&
            buf[i + 1] === target[1] &&
            buf[i + 2] === target[2] &&
            buf[i + 3] === target[3] &&
            buf[i + 4] === target[4]) {
            return i;
        }
    }
    return -1;
}

/**
 * Process an EEG data packet from DSI-Streamer
 * Payload contains big-endian float32 values, one per channel
 *
 * @param {Buffer} payload - Packet payload
 * @param {number} packetNumber - Packet sequence number
 */
function processEEGPacket(payload, packetNumber) {
    tcpPacketsParsed++;
    const numChannels = Math.floor(payload.length / 4);

    if (numChannels === 0) return;

    // Extract channel values (big-endian float32)
    const channelValues = [];
    for (let i = 0; i < numChannels; i++) {
        channelValues.push(payload.readFloatBE(i * 4));
    }

    if (CONFIG.debugLogRawData && packetNumber % 300 === 0) {
        console.log(`[EEG] Packet #${packetNumber}: ${numChannels} channels, values:`,
            channelValues.map(v => v.toFixed(2)).join(', '));
    }

    // For visualization, we average all channels into a single signal.
    // For advanced use, you could process specific channels (e.g., C3/C4 for motor cortex).
    const avgSample = channelValues.reduce((a, b) => a + b, 0) / numChannels;

    // Add to FFT buffer
    eegBuffer.push(avgSample);

    // Keep buffer bounded
    if (eegBuffer.length > CONFIG.fftSize * 2) {
        eegBuffer = eegBuffer.slice(-CONFIG.fftSize * 2);
    }

    // Run FFT when we have enough samples
    if (eegBuffer.length >= CONFIG.fftSize) {
        computeFFTBandPowers();
    }
}

/**
 * Process an event packet from DSI-Streamer
 * @param {Buffer} payload - Event payload
 * @param {number} packetNumber - Packet sequence number
 */
function processEventPacket(payload, packetNumber) {
    console.log(`[EVENT] Packet #${packetNumber}, ${payload.length} bytes`);
    // Event packets may indicate motor spikes or markers
    motorSpike = 1.0;
}

// ============================================
// OSC Mode (Legacy Fallback)
// ============================================

let oscServer = null;

function startOSC() {
    if (!osc) {
        console.error('[OSC] node-osc not installed. Run: npm install node-osc');
        return;
    }

    oscServer = new osc.Server(CONFIG.dsi.oscServerOutport, '0.0.0.0');

    oscServer.on('listening', () => {
        console.log(`[OSC] Listening on port ${CONFIG.dsi.oscServerOutport}`);
    });

    oscServer.on('message', (msg) => {
        try {
            const address = msg[0];
            const data = msg.slice(1);

            if (address === '/eeg' || address === '/raw') {
                processRawOSCData(data);
            } else if (address === '/bands') {
                processOSCBandPowers(data);
            } else if (address === '/marker' || address === '/event') {
                motorSpike = 1.0;
            }
        } catch (error) {
            console.error('[OSC] Error:', error.message);
        }
    });

    oscServer.on('error', (error) => {
        console.error('[OSC] Error:', error.message);
    });
}

function processRawOSCData(data) {
    eegBuffer.push(...data);
    if (eegBuffer.length > CONFIG.fftSize * 2) {
        eegBuffer = eegBuffer.slice(-CONFIG.fftSize * 2);
    }
    if (eegBuffer.length >= CONFIG.fftSize) {
        computeFFTBandPowers();
    }
}

function processOSCBandPowers(data) {
    if (data.length >= 5) {
        const sum = data.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            bandPowers.delta = data[0] / sum;
            bandPowers.theta = data[1] / sum;
            bandPowers.alpha = data[2] / sum;
            bandPowers.beta  = data[3] / sum;
            bandPowers.gamma = data[4] / sum;
        }
    }
}

// ============================================
// FFT-Based Signal Processing
// ============================================

/**
 * Compute band powers using FFT-based Power Spectral Density
 *
 * Pipeline:
 *   1. Extract the most recent fftSize samples
 *   2. Apply Hann window to reduce spectral leakage
 *   3. Compute FFT (complex output)
 *   4. Compute power spectrum: |X(k)|² = real² + imag²
 *   5. Sum power within each band's frequency bins
 *   6. Normalize as relative power (band / total)
 */
function computeFFTBandPowers() {
    const samples = eegBuffer.slice(-CONFIG.fftSize);

    // Apply Hann window
    const windowed = new Array(CONFIG.fftSize);
    for (let i = 0; i < CONFIG.fftSize; i++) {
        windowed[i] = samples[i] * hannWindow[i];
    }

    // Compute FFT
    const output = fft.createComplexArray();
    fft.realTransform(output, windowed);
    fft.completeSpectrum(output);

    // Compute power spectrum
    const halfN = CONFIG.fftSize / 2;
    const powerSpectrum = new Float64Array(halfN);
    let totalPower = 0;

    for (let k = 0; k < halfN; k++) {
        const real = output[2 * k];
        const imag = output[2 * k + 1];
        powerSpectrum[k] = (real * real + imag * imag) / (CONFIG.fftSize * CONFIG.fftSize);
        totalPower += powerSpectrum[k];
    }

    if (totalPower === 0) totalPower = 1;

    // Sum power within each band
    Object.keys(CONFIG.bands).forEach(band => {
        const { startBin, endBin } = binBandMap[band];
        let power = 0;
        for (let k = startBin; k <= endBin; k++) {
            power += powerSpectrum[k];
        }
        bandPowers[band] = power / totalPower;
    });

    detectMotorSpike(totalPower);
}

/**
 * Detect motor spike events using broadband power analysis
 * @param {number} currentTotalPower - Total spectral power from current FFT window
 */
function detectMotorSpike(currentTotalPower) {
    const alpha = CONFIG.spikeDetection.baselineAlpha;
    const threshold = CONFIG.spikeDetection.threshold;

    if (!baselineInitialized) {
        baselinePower = currentTotalPower;
        baselineInitialized = true;
        return;
    }

    baselinePower = baselinePower * (1 - alpha) + currentTotalPower * alpha;

    if (baselinePower > 0 && currentTotalPower > baselinePower * threshold) {
        motorSpike = Math.min(1.0, (currentTotalPower / baselinePower - 1) / (threshold * 2));
    }
}

// ============================================
// Broadcast to Browser Clients
// ============================================

function broadcastData() {
    if (wsClients.size === 0) return;

    const message = JSON.stringify({
        bands: bandPowers,
        motorSpike: motorSpike,
        timestamp: Date.now()
    });

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    motorSpike *= CONFIG.spikeDetection.decay;
}

setInterval(broadcastData, 1000 / CONFIG.updateRate);

// ============================================
// Status Logging
// ============================================

setInterval(() => {
    const mode = CONFIG.connectionMode.toUpperCase();
    const dsiStatus = CONFIG.connectionMode === 'tcp'
        ? (tcpConnected ? 'CONNECTED' : 'DISCONNECTED')
        : 'LISTENING';

    console.log(`[Status] Mode: ${mode} | DSI: ${dsiStatus} | Browser clients: ${wsClients.size}`);
    if (CONFIG.connectionMode === 'tcp') {
        console.log(`  TCP bytes received: ${tcpBytesReceived} | EEG packets parsed: ${tcpPacketsParsed}`);
        if (tcpConnected && tcpBytesReceived === 0) {
            console.log('  ⚠ Connected but NO data received — check DSI-Streamer is streaming');
        }
    }
    console.log('  Band Powers:', Object.fromEntries(
        Object.entries(bandPowers).map(([k, v]) => [k, v.toFixed(4)])
    ));
    console.log('  Motor Spike:', motorSpike.toFixed(3));
    console.log('---');
}, 5000);

// ============================================
// Start Connection
// ============================================

if (CONFIG.connectionMode === 'tcp') {
    console.log(`[TCP] Mode: TCP Client → DSI-Streamer at ${CONFIG.dsi.host}:${CONFIG.dsi.tcpPort}`);
    connectTCP();
} else if (CONFIG.connectionMode === 'osc') {
    console.log(`[OSC] Mode: OSC Server listening on port ${CONFIG.dsi.oscServerOutport}`);
    startOSC();
} else {
    console.error(`Unknown connection mode: ${CONFIG.connectionMode}. Use 'tcp' or 'osc'.`);
}

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', () => {
    console.log('\nShutting down...');

    if (tcpClient) tcpClient.destroy();
    if (tcpReconnectTimer) clearTimeout(tcpReconnectTimer);
    if (oscServer) oscServer.close();

    wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
});

console.log('NeuroArt WebSocket Bridge started');
console.log(`Connection mode: ${CONFIG.connectionMode}`);
console.log('Waiting for DSI-Streamer and browser clients...');
