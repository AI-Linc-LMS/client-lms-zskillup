import type { ResumeData } from './types';

/** Realistic starter content so the templates + preview look populated. */
export const SAMPLE_RESUME: ResumeData = {
  basicInfo: {
    firstName: 'Aarav',
    lastName: 'Sharma',
    professionalTitle: 'Full-Stack Software Engineer',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    summary:
      'Full-stack engineer with 3+ years building scalable web apps in React and Node.js. Shipped features used by 100k+ users and cut API latency by 40% through query and caching work. Strong on system design, testing, and clean, maintainable code.',
    github: 'github.com/aaravsharma',
    linkedin: 'linkedin.com/in/aaravsharma',
    portfolio: 'aarav.dev',
    leetcode: 'leetcode.com/aaravsharma',
  },
  workExperience: [
    {
      id: 'w1',
      position: 'Software Engineer',
      company: 'Nimbus Labs',
      location: 'Bengaluru',
      startDate: '2023-06',
      endDate: '',
      current: true,
      description: [
        'Led the redesign of the billing dashboard in React + TypeScript, improving task completion time by 32%.',
        'Optimised Postgres queries and added Redis caching, reducing p95 API latency from 850ms to 500ms.',
        'Mentored 2 junior engineers and introduced a code-review checklist adopted team-wide.',
      ],
    },
    {
      id: 'w2',
      position: 'Software Engineer Intern',
      company: 'Fintech Co',
      location: 'Remote',
      startDate: '2022-01',
      endDate: '2022-06',
      current: false,
      description: [
        'Built a reusable charting component library used across 4 internal products.',
        'Wrote integration tests raising critical-path coverage from 45% to 80%.',
      ],
    },
  ],
  education: [
    {
      id: 'e1',
      degree: 'B.Tech, Computer Science',
      institution: 'National Institute of Technology',
      location: 'Trichy',
      startDate: '2019-08',
      endDate: '2023-05',
      gpa: '8.7/10',
      description: 'Coursework: Data Structures, DBMS, Operating Systems, Distributed Systems.',
    },
  ],
  skills: [
    { id: 's1', name: 'TypeScript', level: 5, category: 'Languages' },
    { id: 's2', name: 'React', level: 5, category: 'Frontend' },
    { id: 's3', name: 'Node.js', level: 4, category: 'Backend' },
    { id: 's4', name: 'PostgreSQL', level: 4, category: 'Databases' },
    { id: 's5', name: 'AWS', level: 3, category: 'Cloud' },
    { id: 's6', name: 'Docker', level: 4, category: 'DevOps' },
    { id: 's7', name: 'System Design', level: 4, category: 'Core' },
  ],
  projects: [
    {
      id: 'p1',
      name: 'DevBoard',
      description:
        'Real-time Kanban board with WebSocket sync and offline support; 1.2k GitHub stars.',
      technologies: ['React', 'Node.js', 'Socket.IO', 'Redis'],
      link: 'github.com/aaravsharma/devboard',
    },
    {
      id: 'p2',
      name: 'ResumeForge',
      description: 'Open-source resume builder with 8 templates and one-click PDF export.',
      technologies: ['Next.js', 'Tailwind', 'jsPDF'],
      link: 'aarav.dev/resumeforge',
    },
  ],
  certifications: [
    {
      id: 'c1',
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2024-03',
      link: '',
    },
  ],
};
