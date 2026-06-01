/**
 * Static state → cities map for the onboarding dependent dropdowns
 * (STUDENT_JOURNEY_SPEC §1, step 2). Seed-level coverage matching the seeded
 * colleges; the college list itself is fetched from the API per state/city.
 */
export const INDIA_LOCATIONS: Record<string, string[]> = {
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Vellore'],
  Karnataka: ['Bengaluru', 'Mangaluru'],
  Maharashtra: ['Mumbai', 'Pune', 'Sangli'],
  Delhi: ['New Delhi'],
  Telangana: ['Hyderabad'],
  'Andhra Pradesh': ['Visakhapatnam', 'Bhimavaram'],
  'Uttar Pradesh': ['Kanpur', 'Varanasi', 'Prayagraj'],
  'West Bengal': ['Kolkata', 'Howrah'],
  Gujarat: ['Ahmedabad', 'Gandhinagar', 'Surat'],
  Rajasthan: ['Jaipur', 'Pilani'],
  Kerala: ['Kozhikode', 'Thiruvananthapuram', 'Thrissur'],
  Punjab: ['Patiala', 'Jalandhar', 'Chandigarh'],
  'Madhya Pradesh': ['Indore', 'Bhopal'],
  Odisha: ['Rourkela', 'Bhubaneswar'],
};

export const INDIA_STATES = Object.keys(INDIA_LOCATIONS).sort();

/** Passout year options: current year .. +4 (spec §1). */
export const PASSOUT_YEARS = [2026, 2027, 2028, 2029, 2030];

/** Target company options (STUDENT_JOURNEY_SPEC §1, step 3). */
export const TARGET_COMPANIES = {
  serviceBased: ['TCS', 'Wipro', 'Infosys', 'Accenture', 'Capgemini', 'Cognizant'],
  productBased: ['Amazon', 'Google', 'Microsoft', 'Flipkart'],
};
