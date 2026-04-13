from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font('Arial', 'B', 15)
        # Title
        self.cell(0, 10, 'Academic Coursework: AI, XR, and Computational Psychiatry', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        # Arial italic 8
        self.set_font('Arial', 'I', 8)
        # Page number
        self.cell(0, 10, 'Page ' + str(self.page_no()), 0, 0, 'C')

    def chapter_title(self, title):
        # Arial 12
        self.set_font('Arial', 'B', 12)
        # Background color
        self.set_fill_color(200, 220, 255)
        # Title
        self.cell(0, 6, title, 0, 1, 'L', 1)
        # Line break
        self.ln(4)

    def chapter_body(self, body):
        # Arial 10
        self.set_font('Arial', '', 10)
        # Output justified text
        self.multi_cell(0, 5, body)
        # Line break
        self.ln()

    def course_entry(self, code, name, semester, grade, relevance):
        self.set_font('Arial', 'B', 10)
        self.cell(25, 6, code, 0, 0)
        self.cell(90, 6, name, 0, 0)
        self.set_font('Arial', '', 10)
        self.cell(30, 6, semester, 0, 0)
        self.cell(15, 6, grade, 0, 1)
        
        self.set_font('Arial', 'I', 9)
        self.multi_cell(0, 5, "   Relevance: " + relevance)
        self.ln(2)

pdf = PDF()
pdf.add_page()

# --- HEADER INFO ---
pdf.set_font('Arial', 'B', 12)
pdf.cell(0, 6, 'Student: Grayson William Pray', 0, 1)
pdf.set_font('Arial', '', 10)
pdf.cell(0, 5, 'Institution: Kansas State University', 0, 1)
pdf.cell(0, 5, 'Degree: Integrated Computer Science (BS)', 0, 1)
pdf.cell(0, 5, 'Minors: Psychology, Visual Communication Design', 0, 1)
pdf.ln(5)

pdf.set_font('Arial', '', 10)
pdf.multi_cell(0, 5, "Objective: This document outlines academic qualifications for research roles in Artificial Intelligence, Extended Reality (XR/HCI), and Computational Psychiatry. It highlights the intersection of computational logic, neuroscience, and visual design.")
pdf.ln(5)

# --- SECTION 1: AI & Data Science ---
pdf.chapter_title('1. Artificial Intelligence & Data Science')
pdf.multi_cell(0, 5, "Coursework focusing on algorithmic logic, statistical inference, and machine learning principles required for modeling complex systems.")
pdf.ln(2)

pdf.course_entry('CC 590', 'Special Topics: Elements of AI', 'Spring 2026', 'Planned', 
                 'Core AI methodologies, heuristic search, and probabilistic reasoning. Critical for understanding the "logic" behind computational models.')

pdf.course_entry('CC 535', 'Applied Data Science', 'Fall 2025', 'In Progress', 
                 'Data wrangling, feature engineering, and statistical inference. Essential for processing large datasets common in psychiatric research.')

pdf.course_entry('STAT 350', 'Business Economic Statistics', 'Spring 2024', 'B', 
                 'Foundational statistical methods (regression, hypothesis testing) required for analyzing experimental data.')

pdf.course_entry('CC 410', 'Advanced Programming', 'Spring 2025', 'B', 
                 'Advanced software architecture. Demonstrates ability to build robust, scalable tools for research applications.')

pdf.course_entry('CC 310/315', 'Data Structures & Algorithms I/II', '2024', 'B/A', 
                 'Core competence in optimizing data processing, essential for real-time BCI or heavy computational loads.')

# --- SECTION 2: Computational Psychiatry & Neuroscience ---
pdf.chapter_title('2. Computational Psychiatry (Psychology & Neuroscience)')
pdf.multi_cell(0, 5, "Coursework bridging the gap between clinical psychology and computational modeling, specifically focusing on brain mechanisms and research methodology.")
pdf.ln(2)

pdf.course_entry('PSYCH 465', 'Cognitive Neuroscience', 'Fall 2025', 'In Progress', 
                 'Study of neural bases of cognition (memory, attention, executive function). The primary domain knowledge required for BCI and computational psychiatry.')

pdf.course_entry('PSYCH 350', 'Experimental Methods in Psych', 'Fall 2024', 'A', 
                 'Research design, variable control, and methodology. Demonstrates capability to design valid experiments for human-computer interaction.')

pdf.course_entry('PSYCH 505', 'Psychopathology', 'Fall 2024', 'A', 
                 'Clinical understanding of mental health disorders. Essential context for applying AI/computational models to psychiatric diagnostics.')

pdf.course_entry('PSYCH 556', 'Multicultural Psychology', 'Spring 2025', 'A', 
                 'Understanding diverse psychological profiles, critical for reducing bias in AI training data.')

pdf.course_entry('PHILO 386', 'Philosophy of Computer Science', 'Spring 2024', 'A', 
                 'Ethics of AI and software engineering. Relevant for the sensitive ethical considerations of BCI and psychiatric data.')

# --- SECTION 3: XR, HCI & Visual Design ---
pdf.chapter_title('3. XR, HCI & Visual Communication')
pdf.multi_cell(0, 5, "Coursework in design and frontend technologies applicable to Extended Reality (XR) interfaces and Human-Computer Interaction (HCI).")
pdf.ln(2)

pdf.course_entry('ART 330', 'Digital Techniques in Visual Art', 'Fall 2023', 'C', 
                 'Digital asset creation and manipulation. Foundational skills for creating textures and assets for VR/AR environments.')

pdf.course_entry('ART 303', 'Graphic Design', 'Fall 2023', 'B', 
                 'Visual hierarchy and interface design principles, essential for usable BCI/XR user interfaces (UI).')

pdf.course_entry('CC 120', 'Web Page Development', 'Fall 2023', 'A', 
                 'Frontend development fundamentals. Relevant for WebXR and browser-based research tools.')

pdf.course_entry('ENGL 326', 'Digital Humanities', 'Spring 2025', 'A', 
                 'Intersection of technology and human culture; analyzing how digital tools impact human experience.')

pdf.output('/mnt/data/Academic_Coursework_AI_XR_Psychiatry.pdf', 'F')