export const indiaLocations = [
  {
    state: 'Andhra Pradesh',
    cities: [
      { name: 'Visakhapatnam', colleges: [] },
      { name: 'Vijayawada', colleges: [] }
    ]
  },
  {
    state: 'Arunachal Pradesh',
    cities: [
      { name: 'Itanagar', colleges: [] },
      { name: 'Tawang', colleges: [] }
    ]
  },
  {
    state: 'Assam',
    cities: [
      { name: 'Guwahati', colleges: [] },
      { name: 'Dibrugarh', colleges: [] }
    ]
  },
  {
    state: 'Bihar',
    cities: [
      { name: 'Patna', colleges: [] },
      { name: 'Gaya', colleges: [] }
    ]
  },
  {
    state: 'Chhattisgarh',
    cities: [
      { name: 'Raipur', colleges: [] },
      { name: 'Bilaspur', colleges: [] }
    ]
  },
  {
    state: 'Goa',
    cities: [
      { name: 'Panaji', colleges: [] },
      { name: 'Margao', colleges: [] }
    ]
  },
  {
    state: 'Gujarat',
    cities: [
      { name: 'Ahmedabad', colleges: [] },
      { name: 'Surat', colleges: [] }
    ]
  },
  {
    state: 'Haryana',
    cities: [
      { name: 'Gurugram', colleges: [] },
      { name: 'Faridabad', colleges: [] }
    ]
  },
  {
    state: 'Himachal Pradesh',
    cities: [
      { name: 'Shimla', colleges: [] },
      { name: 'Dharamshala', colleges: [] }
    ]
  },
  {
    state: 'Jharkhand',
    cities: [
      { name: 'Ranchi', colleges: [] },
      { name: 'Jamshedpur', colleges: [] }
    ]
  },
  {
    state: 'Karnataka',
    cities: [
      { name: 'Bengaluru', colleges: [] },
      { name: 'Mysuru', colleges: [] }
    ]
  },
  {
    state: 'Kerala',
    cities: [
      { name: 'Kochi', colleges: [] },
      { name: 'Thiruvananthapuram', colleges: [] }
    ]
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      { name: 'Indore', colleges: [] },
      { name: 'Bhopal', colleges: [] }
    ]
  },
  {
    state: 'Maharashtra',
    cities: [
      { name: 'Mumbai', colleges: [] },
      { name: 'Pune', colleges: [] }
    ]
  },
  {
    state: 'Manipur',
    cities: [
      { name: 'Imphal', colleges: [] },
      { name: 'Churachandpur', colleges: [] }
    ]
  },
  {
    state: 'Meghalaya',
    cities: [
      { name: 'Shillong', colleges: [] },
      { name: 'Tura', colleges: [] }
    ]
  },
  {
    state: 'Mizoram',
    cities: [
      { name: 'Aizawl', colleges: [] },
      { name: 'Lunglei', colleges: [] }
    ]
  },
  {
    state: 'Nagaland',
    cities: [
      { name: 'Kohima', colleges: [] },
      { name: 'Dimapur', colleges: [] }
    ]
  },
  {
    state: 'Odisha',
    cities: [
      { name: 'Bhubaneswar', colleges: [] },
      { name: 'Cuttack', colleges: [] }
    ]
  },
  {
    state: 'Punjab',
    cities: [
      {
        name: 'Amritsar',
        colleges: ['Khalsa College', 'GNDU']
      },
      { name: 'Ludhiana', colleges: [] }
    ]
  },
  {
    state: 'Rajasthan',
    cities: [
      { name: 'Jaipur', colleges: [] },
      { name: 'Udaipur', colleges: [] }
    ]
  },
  {
    state: 'Sikkim',
    cities: [
      { name: 'Gangtok', colleges: [] },
      { name: 'Namchi', colleges: [] }
    ]
  },
  {
    state: 'Tamil Nadu',
    cities: [
      { name: 'Chennai', colleges: [] },
      { name: 'Coimbatore', colleges: [] }
    ]
  },
  {
    state: 'Telangana',
    cities: [
      { name: 'Hyderabad', colleges: [] },
      { name: 'Warangal', colleges: [] }
    ]
  },
  {
    state: 'Tripura',
    cities: [
      { name: 'Agartala', colleges: [] },
      { name: 'Udaipur', colleges: [] }
    ]
  },
  {
    state: 'Uttar Pradesh',
    cities: [
      { name: 'Lucknow', colleges: [] },
      { name: 'Noida', colleges: [] }
    ]
  },
  {
    state: 'Uttarakhand',
    cities: [
      { name: 'Dehradun', colleges: [] },
      { name: 'Haridwar', colleges: [] }
    ]
  },
  {
    state: 'West Bengal',
    cities: [
      { name: 'Kolkata', colleges: [] },
      { name: 'Siliguri', colleges: [] }
    ]
  },
  {
    state: 'Andaman and Nicobar Islands',
    cities: [
      { name: 'Port Blair', colleges: [] }
    ]
  },
  {
    state: 'Chandigarh',
    cities: [
      { name: 'Chandigarh', colleges: [] }
    ]
  },
  {
    state: 'Delhi',
    cities: [
      { name: 'New Delhi', colleges: [] }
    ]
  },
  {
    state: 'Jammu and Kashmir',
    cities: [
      { name: 'Srinagar', colleges: [] },
      { name: 'Jammu', colleges: [] }
    ]
  },
  {
    state: 'Ladakh',
    cities: [
      { name: 'Leh', colleges: [] }
    ]
  },
  {
    state: 'Lakshadweep',
    cities: [
      { name: 'Kavaratti', colleges: [] }
    ]
  },
  {
    state: 'Puducherry',
    cities: [
      { name: 'Puducherry', colleges: [] }
    ]
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    cities: [
      { name: 'Daman', colleges: [] },
      { name: 'Silvassa', colleges: [] }
    ]
  }
];

export function getStates() {
  return indiaLocations.map((entry) => entry.state);
}

export function getCitiesForState(state) {
  const match = indiaLocations.find((entry) => entry.state === state);
  return match ? match.cities.map((city) => city.name) : [];
}

export function getCollegesForStateCity(state, city) {
  const stateMatch = indiaLocations.find((entry) => entry.state === state);
  if (!stateMatch) return [];
  const cityMatch = stateMatch.cities.find((entry) => entry.name === city);
  return cityMatch ? cityMatch.colleges : [];
}

