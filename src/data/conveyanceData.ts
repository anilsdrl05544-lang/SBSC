export interface ConveyanceVehicle {
  id: string;
  name: string;
  registrationNo: string;
  type: 'Bus' | 'Van' | 'Auto / Magic' | 'Other';
  capacity: number;
  driverName: string;
  driverPhone: string;
  conductorName?: string;
  conductorPhone?: string;
  primaryRoute: string;
  status: 'Active' | 'Maintenance' | 'Standby';
}

export interface ConveyanceStoppage {
  name: string;
  village?: string; // Stoppage Village Name (ग्राम / गाँव का नाम e.g. Bairwa Nankar, Naugarh)
  pickupTime: string;
  dropTime: string;
  landmark?: string;
}

export interface ConveyanceRoute {
  id: string;
  name: string;
  code: string;
  description: string;
  vehicleId: string;
  defaultMonthlyFee: number;
  stoppages: ConveyanceStoppage[];
}

export interface VillageStoppageMaster {
  village: string;
  hindiName: string;
  defaultRoute: string;
  defaultVehicle: string;
  defaultFee: number;
  stoppages: string[];
}

export const LOCAL_STOPPAGE_VILLAGES: VillageStoppageMaster[] = [
  {
    village: 'Riwa Nankar',
    hindiName: 'रिववां नानकार',
    defaultRoute: 'Riwa Nankar Belt',
    defaultVehicle: 'School Van 02 (Eeco)',
    defaultFee: 0,
    stoppages: ['Riwa Nankar Chauraha', 'Primary School Mod', 'Indian Oil Petrol Pump', 'SBSC Campus Gate'],
  },
  {
    village: 'Amariya',
    hindiName: 'अमरिया',
    defaultRoute: 'Amariya - Sangldeep Route',
    defaultVehicle: 'School Bus 01',
    defaultFee: 800,
    stoppages: ['Amariya Chauraha', 'Amariya Primary School', 'Amariya Mandir Mod', 'Amariya Mod Chowk'],
  },
  {
    village: 'Sangldeep',
    hindiName: 'सांगलदीप',
    defaultRoute: 'Amariya - Sangldeep Route',
    defaultVehicle: 'School Bus 01',
    defaultFee: 900,
    stoppages: ['Sangldeep Chowk', 'Sangldeep Mod', 'Sangldeep Pulia', 'Sangldeep Bazar Tiraha'],
  },
  {
    village: 'Patkhauli',
    hindiName: 'पटखौली',
    defaultRoute: 'Patkhauli - Itauwa Route',
    defaultVehicle: 'School Bus 02',
    defaultFee: 1000,
    stoppages: ['Patkhauli Chauraha', 'Patkhauli Mandir Mod', 'Patkhauli Primary School', 'Patkhauli Pulia'],
  },
  {
    village: 'Itauwa',
    hindiName: 'इतौवा',
    defaultRoute: 'Patkhauli - Itauwa Route',
    defaultVehicle: 'School Bus 02',
    defaultFee: 1000,
    stoppages: ['Itauwa Chauraha', 'Itauwa Mod', 'Itauwa Panchayat Bhavan', 'Itauwa Primary School Mod'],
  },
  {
    village: 'Dhuswa',
    hindiName: 'धुसवा',
    defaultRoute: 'Dhuswa - Gayghat Route',
    defaultVehicle: 'School Van 01 (Tata Magic)',
    defaultFee: 800,
    stoppages: ['Dhuswa Chauraha', 'Dhuswa Mod', 'Dhuswa Kanya Pathshala', 'Dhuswa Mandir Chowk'],
  },
  {
    village: 'Gayghat',
    hindiName: 'गायघाट',
    defaultRoute: 'Dhuswa - Gayghat Route',
    defaultVehicle: 'School Van 01 (Tata Magic)',
    defaultFee: 900,
    stoppages: ['Gayghat Pul', 'Gayghat Chauraha', 'Gayghat Mandir Chowk', 'Gayghat Primary School'],
  },
];

export const INITIAL_VEHICLES: ConveyanceVehicle[] = [
  {
    id: 'veh-1',
    name: 'School Bus 01',
    registrationNo: 'UP 55 T 1234',
    type: 'Bus',
    capacity: 42,
    driverName: 'Rameshwar Prasad',
    driverPhone: '+91 94151 22334',
    conductorName: 'Shambhu Nath',
    conductorPhone: '+91 98380 11223',
    primaryRoute: 'Amariya - Sangldeep Route',
    status: 'Active',
  },
  {
    id: 'veh-2',
    name: 'School Bus 02',
    registrationNo: 'UP 55 T 5678',
    type: 'Bus',
    capacity: 34,
    driverName: 'Dinesh Kumar Yadav',
    driverPhone: '+91 98380 77889',
    conductorName: 'Ram Laut',
    conductorPhone: '+91 99182 33441',
    primaryRoute: 'Patkhauli - Itauwa Route',
    status: 'Active',
  },
  {
    id: 'veh-3',
    name: 'School Van 01 (Tata Magic)',
    registrationNo: 'UP 55 V 9012',
    type: 'Auto / Magic',
    capacity: 14,
    driverName: 'Mohd. Abdul Qadir',
    driverPhone: '+91 99182 55667',
    primaryRoute: 'Dhuswa - Gayghat Route',
    status: 'Active',
  },
  {
    id: 'veh-4',
    name: 'School Van 02 (Eeco)',
    registrationNo: 'UP 55 V 3456',
    type: 'Van',
    capacity: 10,
    driverName: 'Sunil Kumar Verma',
    driverPhone: '+91 94508 33445',
    primaryRoute: 'Riwa Nankar Belt',
    status: 'Active',
  },
];

export const INITIAL_ROUTES: ConveyanceRoute[] = [
  {
    id: 'route-1',
    name: 'Riwa Nankar Belt',
    code: 'R-01',
    description: 'Riwa Nankar Village, Primary School, Petrol Pump to SBSC Campus',
    vehicleId: 'veh-4',
    defaultMonthlyFee: 0,
    stoppages: [
      { name: 'Riwa Nankar Chauraha', village: 'Riwa Nankar', pickupTime: '07:35 AM', dropTime: '02:05 PM', landmark: 'Riwa Shiv Mandir' },
      { name: 'Primary School Mod', village: 'Riwa Nankar', pickupTime: '07:45 AM', dropTime: '01:55 PM', landmark: 'Kanya Pathshala' },
      { name: 'Indian Oil Petrol Pump', village: 'Riwa Nankar', pickupTime: '07:50 AM', dropTime: '01:50 PM', landmark: 'NH Highway Side' },
      { name: 'SBSC Public School Campus', village: 'Riwa Nankar', pickupTime: '08:00 AM', dropTime: '01:40 PM', landmark: 'School Main Gate' },
    ],
  },
  {
    id: 'route-2',
    name: 'Amariya - Sangldeep Route',
    code: 'R-02',
    description: 'Amariya Chauraha, Primary School, Sangldeep Chowk & Pulia to SBSC Campus',
    vehicleId: 'veh-1',
    defaultMonthlyFee: 850,
    stoppages: [
      { name: 'Amariya Chauraha', village: 'Amariya', pickupTime: '07:15 AM', dropTime: '02:25 PM', landmark: 'Amariya Main Market' },
      { name: 'Amariya Primary School', village: 'Amariya', pickupTime: '07:25 AM', dropTime: '02:15 PM', landmark: 'School Gate' },
      { name: 'Sangldeep Chowk', village: 'Sangldeep', pickupTime: '07:35 AM', dropTime: '02:05 PM', landmark: 'Sangldeep Bazar' },
      { name: 'Sangldeep Pulia', village: 'Sangldeep', pickupTime: '07:45 AM', dropTime: '01:55 PM', landmark: 'Canal Pul' },
      { name: 'SBSC Public School Campus', village: 'Riwa Nankar', pickupTime: '08:00 AM', dropTime: '01:40 PM', landmark: 'School Main Gate' },
    ],
  },
  {
    id: 'route-3',
    name: 'Patkhauli - Itauwa Route',
    code: 'R-03',
    description: 'Patkhauli Chauraha, Mandir Mod, Itauwa Panchayat Bhavan to SBSC Campus',
    vehicleId: 'veh-2',
    defaultMonthlyFee: 1000,
    stoppages: [
      { name: 'Patkhauli Chauraha', village: 'Patkhauli', pickupTime: '07:10 AM', dropTime: '02:30 PM', landmark: 'Patkhauli Tiraha' },
      { name: 'Patkhauli Mandir Mod', village: 'Patkhauli', pickupTime: '07:20 AM', dropTime: '02:20 PM', landmark: 'Mandir Side' },
      { name: 'Itauwa Chauraha', village: 'Itauwa', pickupTime: '07:35 AM', dropTime: '02:05 PM', landmark: 'Itauwa Market' },
      { name: 'Itauwa Panchayat Bhavan', village: 'Itauwa', pickupTime: '07:45 AM', dropTime: '01:55 PM', landmark: 'Panchayat Gate' },
      { name: 'SBSC Public School Campus', village: 'Riwa Nankar', pickupTime: '08:00 AM', dropTime: '01:40 PM', landmark: 'School Main Gate' },
    ],
  },
  {
    id: 'route-4',
    name: 'Dhuswa - Gayghat Route',
    code: 'R-04',
    description: 'Dhuswa Chauraha, Kanya Pathshala, Gayghat Pul & Chauraha to SBSC Campus',
    vehicleId: 'veh-3',
    defaultMonthlyFee: 850,
    stoppages: [
      { name: 'Dhuswa Chauraha', village: 'Dhuswa', pickupTime: '07:20 AM', dropTime: '02:20 PM', landmark: 'Dhuswa Mod' },
      { name: 'Dhuswa Kanya Pathshala', village: 'Dhuswa', pickupTime: '07:30 AM', dropTime: '02:10 PM', landmark: 'Pathshala Gate' },
      { name: 'Gayghat Pul', village: 'Gayghat', pickupTime: '07:40 AM', dropTime: '02:00 PM', landmark: 'Bridge Chowk' },
      { name: 'Gayghat Chauraha', village: 'Gayghat', pickupTime: '07:48 AM', dropTime: '01:52 PM', landmark: 'Mandir Tiraha' },
      { name: 'SBSC Public School Campus', village: 'Riwa Nankar', pickupTime: '08:00 AM', dropTime: '01:40 PM', landmark: 'School Main Gate' },
    ],
  },
];

import { Student } from '../types/school';

export function getStoredVehicles(): ConveyanceVehicle[] {
  try {
    const saved = localStorage.getItem('sbsc_conveyance_vehicles_v2');
    if (saved) {
      const parsed: ConveyanceVehicle[] = JSON.parse(saved);
      const hasOldRoute = parsed.some((v) =>
        v.primaryRoute.includes('Tetari') ||
        v.primaryRoute.includes('Shohratgarh') ||
        v.primaryRoute.includes('Naugarh') ||
        v.primaryRoute.includes('Bansi') ||
        v.primaryRoute.includes('Uska')
      );
      if (!hasOldRoute && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_VEHICLES;
}

export function saveStoredVehicles(vehicles: ConveyanceVehicle[]) {
  try {
    localStorage.setItem('sbsc_conveyance_vehicles_v2', JSON.stringify(vehicles));
  } catch {}
}

export function getStoredRoutes(): ConveyanceRoute[] {
  try {
    const saved = localStorage.getItem('sbsc_conveyance_routes_v2');
    if (saved) {
      const parsed: ConveyanceRoute[] = JSON.parse(saved);
      const hasOldRoute = parsed.some((r) =>
        r.name.includes('Tetari') ||
        r.name.includes('Shohratgarh') ||
        r.name.includes('Naugarh') ||
        r.name.includes('Bansi') ||
        r.name.includes('Uska')
      );
      if (!hasOldRoute && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_ROUTES;
}

export function saveStoredRoutes(routes: ConveyanceRoute[]) {
  try {
    localStorage.setItem('sbsc_conveyance_routes_v2', JSON.stringify(routes));
  } catch {}
}

export interface AddressConveyanceMatch {
  matched: boolean;
  confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'FALLBACK';
  confidenceScore: number;
  village: string;
  hindiVillage: string;
  route: string;
  stoppage: string;
  vehicle: string;
  driverName: string;
  driverPhone: string;
  monthlyFee: number;
  matchedKeyword: string;
  explanation: string;
}

/**
 * Matches a student's address against local villages, routes, and stoppages
 */
export function matchAddressToConveyance(
  address?: string,
  fallbackFee?: number
): AddressConveyanceMatch {
  const addr = (address || '').trim();
  const lower = addr.toLowerCase();

  const getDriverForVehicle = (vehName: string) => {
    if (vehName.includes('Bus 01')) return { name: 'Rameshwar Prasad', phone: '+91 94151 22334' };
    if (vehName.includes('Bus 02')) return { name: 'Dinesh Kumar Yadav', phone: '+91 98380 77889' };
    if (vehName.includes('Magic') || vehName.includes('Van 01')) return { name: 'Mohd. Abdul Qadir', phone: '+91 99182 55667' };
    return { name: 'Sunil Kumar Verma', phone: '+91 94508 33445' };
  };

  const villageKeywords: Array<{
    village: string;
    keywords: string[];
  }> = [
    { village: 'Riwa Nankar', keywords: ['riwa nankar', 'riwa', 'reewa', 'bairwa nankar', 'bairwa', 'nankar', 'रिववां', 'रिववा', 'रीवा', 'बैरवा', 'नानकार', 'sbsc campus'] },
    { village: 'Amariya', keywords: ['amariya', 'amaria', 'अमरिया', 'अमरीया'] },
    { village: 'Sangldeep', keywords: ['sangldeep', 'sangaldeep', 'सांगलदीप', 'संगलदीप', 'सांगल दीप'] },
    { village: 'Patkhauli', keywords: ['patkhauli', 'patkholi', 'पटखौली', 'पटखोली'] },
    { village: 'Itauwa', keywords: ['itauwa', 'itwa', 'itawa', 'इतौवा', 'इटौवा', 'इटवा'] },
    { village: 'Dhuswa', keywords: ['dhuswa', 'dhusua', 'धुसवा', 'धुसुआ'] },
    { village: 'Gayghat', keywords: ['gayghat', 'gaighat', 'गायघाट', 'गैघाट', 'गाय घाट'] },
  ];

  let matchedVillageName = '';
  let matchedKeyword = '';
  let confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'FALLBACK' = 'FALLBACK';
  let confidenceScore = 40;
  let explanation = 'No specific village keyword detected in address. Defaulted to school local belt.';

  for (const item of villageKeywords) {
    for (const kw of item.keywords) {
      if (lower.includes(kw)) {
        matchedVillageName = item.village;
        matchedKeyword = kw;
        if (kw.length > 7 || kw === 'riwa nankar' || kw === 'bairwa nankar' || kw === 'sangaldeep' || kw === 'patkhauli') {
          confidence = 'EXACT';
          confidenceScore = 95;
          explanation = `Exact match on "${kw}" in address.`;
        } else {
          confidence = 'HIGH';
          confidenceScore = 85;
          explanation = `High confidence match on "${kw}" in address.`;
        }
        break;
      }
    }
    if (matchedVillageName) break;
  }

  // If no match found, fallback to Riwa Nankar
  if (!matchedVillageName) {
    matchedVillageName = 'Riwa Nankar';
    matchedKeyword = 'local-area';
    confidence = 'FALLBACK';
    confidenceScore = 50;
  }

  const villageMaster = LOCAL_STOPPAGE_VILLAGES.find((v) => v.village === matchedVillageName) || LOCAL_STOPPAGE_VILLAGES[0];

  // Specific stoppage detection in address
  let selectedStoppage = villageMaster.stoppages[0];
  for (const stop of villageMaster.stoppages) {
    const stopWords = stop.toLowerCase().split(/[\s,]+/);
    for (const w of stopWords) {
      if (w.length > 4 && lower.includes(w) && !villageKeywords.some((vk) => vk.village.toLowerCase() === w)) {
        selectedStoppage = stop;
        confidenceScore = Math.min(99, confidenceScore + 4);
        explanation += ` Stoppage landmark "${stop}" identified.`;
        break;
      }
    }
  }

  const driver = getDriverForVehicle(villageMaster.defaultVehicle);

  return {
    matched: confidence !== 'FALLBACK',
    confidence,
    confidenceScore,
    village: villageMaster.village,
    hindiVillage: villageMaster.hindiName,
    route: villageMaster.defaultRoute,
    stoppage: selectedStoppage,
    vehicle: villageMaster.defaultVehicle,
    driverName: driver.name,
    driverPhone: driver.phone,
    monthlyFee: fallbackFee && fallbackFee > 0 && fallbackFee !== 600 ? fallbackFee : 0,
    matchedKeyword,
    explanation,
  };
}

/**
 * Hydrates a student's conveyance info only if the student already has
 * conveyance fee assigned (>0) or an assigned transport vehicle/route.
 * If conveyFee is 600, it is reset to 0.
 */
export function hydrateStudentConveyance(student: Student): Student {
  let currentConveyFee = student.conveyFee || 0;
  if (currentConveyFee === 600) {
    currentConveyFee = 0;
  }
  // If the student doesn't have conveyance assigned, do not modify
  if (currentConveyFee <= 0 && !student.conveyVehicle && !student.conveyRoute) {
    if (student.conveyFee === 600) {
      return {
        ...student,
        conveyFee: 0,
        totalYearlyDue: Math.max(0, (student.totalYearlyDue || 0) - 600),
      };
    }
    return student;
  }

  const match = matchAddressToConveyance(student.address, currentConveyFee);
  const updated = { ...student };

  if (updated.conveyFee === 600) {
    updated.conveyFee = 0;
    if (typeof updated.totalYearlyDue === 'number' && updated.totalYearlyDue >= 600) {
      updated.totalYearlyDue -= 600;
    }
  }

  if (!updated.conveyVehicle && match.vehicle) {
    updated.conveyVehicle = match.vehicle;
  }
  if (!updated.conveyRoute && match.route) {
    updated.conveyRoute = match.route;
  }
  if (!updated.conveyStop && match.stoppage) {
    updated.conveyStop = match.stoppage;
  }
  if (!updated.conveyVillage && match.village) {
    updated.conveyVillage = match.village;
  }
  if (!updated.conveyDriverName && match.driverName) {
    updated.conveyDriverName = match.driverName;
  }
  if (!updated.conveyDriverPhone && match.driverPhone) {
    updated.conveyDriverPhone = match.driverPhone;
  }

  return updated;
}

/**
 * Quick helper to auto-detect conveyance details and fee for an address.
 */
export function getAutoCalculatedConveyance(address?: string, currentFee?: number) {
  return matchAddressToConveyance(address, currentFee);
}

