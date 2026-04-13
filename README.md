# NeuroArt - EEG Abstract Art Generator

This program turns EEG signal data into abstract art using P5.js.

## Features

- **Real-Time EEG Processing**: Connects to Wearable Sensing DSI-7 headset via DSI-Streamer
- **Fluid Particle System**: 500-2000 particles with Perlin noise flow fields creating organic smoke-like motion
- **Dynamic Visual Mapping**:
  - Theta/Alpha → Color hue and opacity
  - Beta/Gamma → Velocity and turbulence
  - Delta → Background ambience
  - Motor Spikes → Visual bursts and sparks
- **User-Adjustable Controls**: Fine-tune how each brainwave frequency influences the visuals
- **Visual Presets**: Calming, Energetic, Balanced, Meditative, and Focused modes
- **Adaptive Performance**: Automatically adjusts quality for smooth 60fps on standard hardware
- **VR-Ready**: Optimized for Meta Quest 3 and similar VR devices
- **Mock Data Mode**: Test without EEG hardware using realistic simulated brainwave data

## Quick Start

### Prerequisites

- **Hardware** (Optional): Wearable Sensing DSI-7 EEG headset with DSI-Streamer software
- **Software**:
  - Modern web browser (Chrome, Firefox, Edge, Safari)
  - Node.js v16+ (for WebSocket bridge)
  - npm or yarn

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd c:\Path\To\Directory
   ```

2. **Install WebSocket bridge dependencies**:
   ```bash
   cd bridge
   npm install
   cd ..
   ```

3. **Start the WebSocket bridge** (if using real EEG data):
   ```bash
   cd bridge
   npm start
   ```

4. **Start a local web server**:
   ```bash
   # Option 1: Python
   python -m http.server 8000

   # Option 2: Node.js http-server
   npx http-server -p 8000

   # Option 3: PHP
   php -S localhost:8000
   ```

5. **Open in browser**:
   Navigate to `http://localhost:8000`

## Usage

### Without EEG Hardware (Testing)

1. Open the application in your browser
2. Click **"Enable Mock Data"** button in the control panel
3. Observe the fluid visualizations responding to simulated brainwave data
4. Experiment with different presets and band weights

### With DSI-7 EEG Headset

1. **Configure DSI-Streamer**:
   - Set OSC output to port `8944`
   - Set OSC input to port `8844`
   - Enable data streaming

2. **Start the WebSocket bridge**:
   ```bash
   cd bridge
   npm start
   ```

3. **Open the web application**
   - The connection status will show "Connected" when EEG data is flowing

4. **Wear the headset and explore**:
   - Perform different mental tasks (eyes open/closed, relaxation, focus)
   - Watch the visualizations respond in real-time to your brain activity

## Control Panel

### Visual Presets

- **🌊 Calming**: Emphasizes theta/alpha waves for relaxed, flowing visuals
- **⚖️ Balanced**: Default balanced preset for general use
- **⚡ Energetic**: Highlights beta/gamma for fast, dynamic visuals
- **🧘 Meditative**: Deep, slow-moving visuals focused on delta/theta
- **🎯 Focused**: Sharp, responsive visuals for concentration states

### Brainwave Band Weights

Adjust how strongly each frequency band affects the visuals:

- **Delta (0.5-4 Hz)**: Deep sleep, unconscious states → Background ambience
- **Theta (4-8 Hz)**: Meditation, creativity → Color (purple/blue hues)
- **Alpha (8-13 Hz)**: Relaxation, eyes closed → Color (cyan/green), opacity
- **Beta (13-30 Hz)**: Active thinking, focus → Particle velocity
- **Gamma (30-100 Hz)**: High-level cognition → Turbulence, chaos
- **Motor Spike Intensity**: Controls burst strength for movement events

### Performance Settings

**Graphics Quality**:
- **Auto (Adaptive)**: Automatically adjusts based on FPS
- **Low**: 500 particles, minimal trails
- **Medium**: 1000 particles, moderate trails (default)
- **High**: 1500 particles, full trails
- **Ultra**: 2000 particles, all effects enabled (for dedicated GPUs)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle control panel |
| `F` | Toggle fullscreen |
| `M` | Toggle mock data |
| `H` | Show help overlay |
| `S` | Save current settings |
| `R` | Reset to default settings |
| `1-5` | Load presets 1-5 |

## Architecture

```
┌─────────────────┐
│  DSI-7 Headset  │
└────────┬────────┘
         │ EEG Data
         ▼
┌─────────────────┐
│  DSI-Streamer   │
│   (OSC Output)  │
└────────┬────────┘
         │ OSC (Port 8944)
         ▼
┌─────────────────┐
│ WebSocket Bridge│
│   (Node.js)     │
└────────┬────────┘
         │ WebSocket (Port 8080)
         ▼
┌─────────────────┐
│   Web Browser   │
│  (P5.js App)    │
└─────────────────┘
```

### Key Components

- **eegDataHandler.js**: WebSocket connection, data buffering, mock data generator
- **signalProcessor.js**: Signal smoothing, spike detection, mental state estimation
- **dataMapper.js**: Maps EEG bands to visual parameters (color, motion, turbulence)
- **fluidParticles.js**: Particle system with Perlin noise flow fields
- **visualEffects.js**: Motor spike bursts, sparks, and atmospheric effects
- **uiController.js**: User interface management and settings persistence
- **sketch.js**: Main P5.js render loop and orchestration

## Configuration

Edit `config.js` to customize:

- WebSocket connection settings
- Performance parameters
- Color palettes
- Particle behavior
- Signal processing parameters
- Mock data characteristics

Example:
```javascript
CONFIG.websocket.url = 'ws://localhost:8080';
CONFIG.performance.defaultParticleCount = 1500;
CONFIG.colorPalettes.spectrum.hueRange = [0, 360];
```

## Troubleshooting

### Connection Issues

**"Disconnected" status**:
1. Ensure WebSocket bridge is running (`npm start` in bridge folder)
2. Check that DSI-Streamer is streaming data
3. Verify OSC ports match configuration (8944/8844)
4. Use "Enable Mock Data" to test without hardware

### Performance Issues

**Low FPS / Choppy visuals**:
1. Set quality to "Low" or "Auto (Adaptive)"
2. Reduce particle count in config.js
3. Disable trail effects for better performance
4. Close other browser tabs/applications

### No Visual Response

**Visuals not changing with EEG**:
1. Check that band weight sliders are not set to zero
2. Verify WebSocket connection is active
3. Check browser console for errors (F12)
4. Ensure headset is properly positioned and connected

## VR Mode (Meta Quest 3)

1. Enable VR in config.js:
   ```javascript
   CONFIG.vr.enabled = true;
   ```

2. Use Ultra quality for best visuals on Quest 3

3. Access via Quest browser at your local IP:
   ```
   http://192.168.1.XXX:8000
   ```

4. Enable fullscreen mode for immersive experience

## Technical Specifications

- **Target Frame Rate**: 60 FPS
- **Particle Count**: 500-2000 (adaptive)
- **Update Rate**: 30 Hz (EEG data)
- **Signal Smoothing**: Exponential moving average (smoothing factor: 0.15)
- **Color Mode**: HSL with RGB conversion
- **Flow Field**: 3D Perlin noise
- **Rendering**: P5.js 2D canvas (WebGL option available)

## Future Implementations

Contributions welcome! Features/improvements I hope to add:

- Advanced FFT implementation for better frequency analysis
- Additional visual presets and effects
- Recording/replay functionality
- Multi-user collaborative visualizations

## License

MIT License - Feel free to use and modify :)

## Credits

- **P5.js** - Creative coding library
- **Wearable Sensing** - DSI-7 EEG headset
- **Node-OSC** - OSC communication library
- **ws** - WebSocket library

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Ensure all dependencies are installed correctly
4. Feel free to contact me at graysonpray@gmail.com

---