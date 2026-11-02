// AFH 1, Airman (15 February 2025): chapters and sections with the Airman Development and Testing
// Chart (ADTC) comprehension level required for each rank (pages 12-14). The chart, not the section
// headers, is the source: four section headers (7B, 13B, 14D, 15C) differ from it at TSgt and above.
// Section 14E is deleted and Attachments 1-3, 5, 6, and 8 are not testable (N/A), so they are omitted.

export const AFH1_EDITION = '15 February 2025';

export const comprehensionLevels = {
  A: { name: 'Remembering', description: 'Recognizing or recalling knowledge from memory: producing or retrieving definitions, facts, or lists, or reciting previously learned information.' },
  B: { name: 'Understanding', description: 'Constructing meaning from written or graphic messages or activities: interpreting, exemplifying, classifying, summarizing, inferring, comparing, or explaining.' },
  C: { name: 'Applying', description: 'Carrying out or using a procedure through executing or implementing; using learned material in models, presentations, interviews, or simulations.' },
  D: { name: 'Analyzing', description: 'Breaking materials or concepts into parts and determining how the parts relate to one another and to an overall structure or purpose.' },
};

export const afh1Chapters = [
 {
  "id": "c01",
  "number": 1,
  "title": "Professionalism",
  "sections": [
   {
    "id": "1A",
    "title": "USAF Professional",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "1B",
    "title": "Profession of Arms",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "1C",
    "title": "USAF Core Values",
    "levels": {
     "e5": "C",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "1D",
    "title": "Ethical Standards",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c02",
  "number": 2,
  "title": "Aviation History",
  "sections": [
   {
    "id": "2A",
    "title": "Aviation Fundamentals",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "2B",
    "title": "Aviation and Operations in World War I",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "2C",
    "title": "Aviation and Operations in World War II",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "2D",
    "title": "The Edge of Space",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   }
  ]
 },
 {
  "id": "c03",
  "number": 3,
  "title": "Air Force Heritage",
  "sections": [
   {
    "id": "3A",
    "title": "The Air Force and the Mid-1900s",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "3B",
    "title": "The Air Force and the Post-Cold War",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "3C",
    "title": "The Air Force and the New Millennium",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   }
  ]
 },
 {
  "id": "c04",
  "number": 4,
  "title": "Air and Cyberpower",
  "sections": [
   {
    "id": "4A",
    "title": "Identifying with Airpower",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "4B",
    "title": "Aircraft Systems",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "D"
    }
   },
   {
    "id": "4C",
    "title": "Missile and Munition Systems",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c05",
  "number": 5,
  "title": "Military Organization and Command",
  "sections": [
   {
    "id": "5A",
    "title": "United States Armed Forces",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "5B",
    "title": "Military Departments",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "5C",
    "title": "Military Command Structure",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "5D",
    "title": "Air Force Total Force",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "5E",
    "title": "Air Force Structure",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c06",
  "number": 6,
  "title": "Doctrine and Joint Force",
  "sections": [
   {
    "id": "6A",
    "title": "Doctrine",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "6B",
    "title": "Joint Force",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "6C",
    "title": "Joint Operation Planning",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c07",
  "number": 7,
  "title": "Enlisted Force Development",
  "sections": [
   {
    "id": "7A",
    "title": "Leadership Levels",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "7B",
    "title": "Enlisted Force Structure",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "7C",
    "title": "Duty Titles and Special Positions",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "D",
     "e9": "D"
    }
   },
   {
    "id": "7D",
    "title": "Force Development",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "7E",
    "title": "Training Responsibilities",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "7F",
    "title": "Professional Military Education",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "7G",
    "title": "Community College of the Air Force",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "7H",
    "title": "Continuing Education",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c08",
  "number": 8,
  "title": "Assessments and Recognition",
  "sections": [
   {
    "id": "8A",
    "title": "Airman Comprehensive Assessment",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "8B",
    "title": "Performance Evaluations",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "8C",
    "title": "Reenlistments and Continuation",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "8D",
    "title": "Awards and Decorations",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c09",
  "number": 9,
  "title": "Enlisted Promotions",
  "sections": [
   {
    "id": "9A",
    "title": "Promotion Systems and Programs",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "9B",
    "title": "Promotion Cycles",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "9C",
    "title": "Preparation and Responsibilities",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "9D",
    "title": "Promotion Testing",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "9E",
    "title": "Evaluation Boards",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c10",
  "number": 10,
  "title": "Assignments and Occupational Codes",
  "sections": [
   {
    "id": "10A",
    "title": "Eligibility and Restrictions",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "10B",
    "title": "Occupational Codes",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "10C",
    "title": "Special Duties",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c11",
  "number": 11,
  "title": "Personnel Programs and Benefits",
  "sections": [
   {
    "id": "11A",
    "title": "Benefits and Services",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "11B",
    "title": "Leave and Authorized Absences",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "11C",
    "title": "Military Associations",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "C"
    }
   },
   {
    "id": "11D",
    "title": "Civilian Programs",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c12",
  "number": 12,
  "title": "Finance, Manpower, and Resources",
  "sections": [
   {
    "id": "12A",
    "title": "Individual Finances and Allowances",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "12B",
    "title": "Official Travel Expenses and Allowances",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "12C",
    "title": "Manpower Management",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "12D",
    "title": "Resource Management",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "12E",
    "title": "Environmental Commitment",
    "levels": {
     "e5": "A",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c13",
  "number": 13,
  "title": "Developing Organizations",
  "sections": [
   {
    "id": "13A",
    "title": "Strategic Thinking and Results Focus",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "13B",
    "title": "Resources and Organizational Structure",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "13C",
    "title": "Change and Problem Solving",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   }
  ]
 },
 {
  "id": "c14",
  "number": 14,
  "title": "Developing Others",
  "sections": [
   {
    "id": "14A",
    "title": "Teamwork",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "14B",
    "title": "Develops People",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "14C",
    "title": "Service Mindset",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "D",
     "e9": "D"
    }
   },
   {
    "id": "14D",
    "title": "Leadership",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "D",
     "e9": "D"
    }
   }
  ]
 },
 {
  "id": "c15",
  "number": 15,
  "title": "Developing Self",
  "sections": [
   {
    "id": "15A",
    "title": "Accountability and Self-Management",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "15B",
    "title": "Military Communication",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "15C",
    "title": "Preparing to Communicate",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "15D",
    "title": "Written Communication",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "15E",
    "title": "Spoken Communication",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "D"
    }
   },
   {
    "id": "15F",
    "title": "Electronic Messaging",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c16",
  "number": 16,
  "title": "Developing Ideas",
  "sections": [
   {
    "id": "16A",
    "title": "What We Know",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "16B",
    "title": "Cognitive Processes",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "16C",
    "title": "Informed Decision-Making",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "16D",
    "title": "What We Don\u2019t Know",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c17",
  "number": 17,
  "title": "Emergency Management",
  "sections": [
   {
    "id": "17A",
    "title": "Air Force Emergency Management",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "17B",
    "title": "Disasters, Attacks, and Hazards",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "17C",
    "title": "Preparedness and Protection",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "17D",
    "title": "Crisis Response and Recovery",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "17E",
    "title": "Department of the Air Force Mishap Prevention",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "17F",
    "title": "Risk Management",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c18",
  "number": 18,
  "title": "Security",
  "sections": [
   {
    "id": "18A",
    "title": "Integrated Defense",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "18B",
    "title": "Operations Security",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "18C",
    "title": "Information Protection",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "18D",
    "title": "Information Access, Cyber Security and Mobility",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "18E",
    "title": "Antiterrorism",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c19",
  "number": 19,
  "title": "Standards of Conduct",
  "sections": [
   {
    "id": "19A",
    "title": "Way of Life",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "19B",
    "title": "Law of War",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "19C",
    "title": "Code of Conduct",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c20",
  "number": 20,
  "title": "Enforcing Military Standards",
  "sections": [
   {
    "id": "20A",
    "title": "Air Force Inspection System",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "20B",
    "title": "Individual Accountability",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "20C",
    "title": "Appropriate Working Relationships",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "20D",
    "title": "Addressing Misconduct",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c21",
  "number": 21,
  "title": "Military Justice",
  "sections": [
   {
    "id": "21A",
    "title": "Military Law",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "21B",
    "title": "Legal Enforcement",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "21C",
    "title": "Nonjudicial Punishment",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "21D",
    "title": "Courts-Martial",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c22",
  "number": 22,
  "title": "Fitness and Readiness",
  "sections": [
   {
    "id": "22A",
    "title": "USAF Fitness",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "22B",
    "title": "Official Fitness Assessment",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "22C",
    "title": "Nutrition",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "22D",
    "title": "Substance Use or Abuse",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "22E",
    "title": "Readiness State of Mind",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c23",
  "number": 23,
  "title": "Dress and Appearance",
  "sections": [
   {
    "id": "23A",
    "title": "Professional Image",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "23B",
    "title": "Military Uniforms",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "c24",
  "number": 24,
  "title": "Military Customs and Courtesies",
  "sections": [
   {
    "id": "24A",
    "title": "Honored Traditions",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "24B",
    "title": "Respect for the Flag",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "24C",
    "title": "Respect for Individuals",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "24D",
    "title": "Ceremonies and Events",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   },
   {
    "id": "24E",
    "title": "Drill and Formation",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "C"
    }
   },
   {
    "id": "24F",
    "title": "Preserving Our Heritage",
    "levels": {
     "e5": "B",
     "e6": "C",
     "e7": "C",
     "e8": "C",
     "e9": "C"
    }
   }
  ]
 },
 {
  "id": "att",
  "number": null,
  "title": "Attachments",
  "sections": [
   {
    "id": "ATT4",
    "title": "Chief Master Sergeants of the Air Force",
    "levels": {
     "e5": "A",
     "e6": "A",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   },
   {
    "id": "ATT7",
    "title": "USAF Medal of Honor Recipients",
    "levels": {
     "e5": "B",
     "e6": "B",
     "e7": "B",
     "e8": "B",
     "e9": "B"
    }
   }
  ]
 }
];
