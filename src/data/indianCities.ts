export const INDIAN_CITIES = [
    'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Pune',
    'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
    'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
    'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad',
    'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
    'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Chandigarh',
    'Guwahati', 'Solapur', 'Hubli', 'Mysuru', 'Tiruchirappalli', 'Bareilly', 'Aligarh',
    'Tiruppur', 'Moradabad', 'Jalandhar', 'Bhubaneswar', 'Salem', 'Warangal', 'Guntur',
    'Bhiwandi', 'Saharanpur', 'Gorakhpur', 'Bikaner', 'Amravati', 'Noida', 'Jamshedpur',
    'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun',
    'Durgapur', 'Asansol', 'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola',
    'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 'Ulhasnagar',
    'Mangaluru', 'Erode', 'Belgaum', 'Ambattur', 'Tirunelveli', 'Malegaon', 'Gaya',
    'Udaipur', 'Maheshtala', 'Davanagere', 'Kozhikode', 'Kurnool', 'Rajpur Sonarpur',
    'Rajahmundry', 'Bokaro', 'South Dumdum', 'Bellary', 'Patiala', 'Gopalpur', 'Agartala',
    'Bhagalpur', 'Muzaffarnagar', 'Bhatpara', 'Panihati', 'Latur', 'Dhule', 'Rohtak',
    'Sagar', 'Korba', 'Bhilwara', 'Berhampur', 'Muzaffarpur', 'Ahmednagar', 'Mathura',
    'Kollam', 'Avadi', 'Kadapa', 'Kamarhati', 'Sambalpur', 'Bilaspur', 'Shahjahanpur',
    'Satara', 'Bijapur', 'Rampur', 'Shimoga', 'Chandrapur', 'Junagadh', 'Thrissur',
    'Alwar', 'Bardhaman', 'Kulti', 'Kakinada', 'Nizamabad', 'Parbhani', 'Tumkur',
    'Hisar', 'Ozhukarai', 'Bihar Sharif', 'Panipat', 'Darbhanga', 'Bally', 'Aizawl',
    'Dewas', 'Ichalkaranji', 'Karnal', 'Bathinda', 'Jalna', 'Eluru', 'Barasat',
    'Kirari Suleman Nagar', 'Purnia', 'Satna', 'Mau', 'Sonipat', 'Farrukhabad',
    'Durg', 'Imphal', 'Ratlam', 'Hapur', 'Arrah', 'Anantapur', 'Karimnagar',
    'Etawah', 'Ambarnath', 'North Dumdum', 'Bharatpur', 'Begusarai', 'New Delhi',
    'Gandhidham', 'Baranagar', 'Tiruvottiyur', 'Pondicherry', 'Sikar', 'Thoothukudi',
    'Rewa', 'Mirzapur', 'Raichur', 'Pali', 'Ramagundam', 'Silchar', 'Haridwar',
    'Vijayanagaram', 'Tenali', 'Proddatur', 'Chittoor', 'Madhyamgram', 'Srikalahasti',
    'Mango', 'Adoni', 'Naihati', 'Dibrugarh', 'Kharagpur', 'Dindigul', 'Hospet',
    'Gandhinagar', 'Shimla', 'Jammu', 'Rishikesh', 'Haldwani', 'Thanjavur',
    'Vellore', 'Tirupati', 'Secunderabad', 'Nagercoil', 'Katihar', 'Sambhal',
    'Narasaraopet', 'Bathinda', 'Ongole', 'Shillong', 'Itanagar', 'Kohima',
    'Gangtok', 'Port Blair', 'Daman', 'Silvassa', 'Kavaratti', 'Leh',
    'Greater Noida', 'Gurgaon', 'Mohali', 'Panchkula', 'Zirakpur',
    'Khopoli', 'Vasai', 'Virar', 'Kalyan', 'Dombivli', 'Mira-Bhayandar',
    'Mumbra', 'Ulwe', 'Kharghar', 'Panvel', 'Lonavala', 'Alibaug',
];

export function searchCities(query: string): string[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return INDIAN_CITIES
        .filter(city => city.toLowerCase().startsWith(q))
        .slice(0, 8);
}
