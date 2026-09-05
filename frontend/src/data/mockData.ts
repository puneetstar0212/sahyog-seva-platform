import type { Service, Worker, Booking, ChatMessage, Gig, Society, DividendRecord, DemandCell } from '@/types';

export const services: Service[] = [
  { id: 's1', name: 'Electrical Services', category: 'Electrical', icon: 'Zap', color: 'peach', description: 'घर की वायरिंग, बिजली की मरम्मत, स्विच और सॉकेट की स्थापना के लिए सत्यापित इलेक्ट्रीशियन उपलब्ध हैं।', basePrice: 250, unit: 'visit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw', tags: ['Wiring', 'Repair', 'Installation'] },
  { id: 's2', name: 'Plumbing Services', category: 'Plumbing', icon: 'Droplets', color: 'blue', description: 'पाइप की मरम्मत, पानी के रिसाव को ठीक करना, नल और फिटिंग लगाने के लिए कुशल प्लंबर उपलब्ध हैं।', basePrice: 200, unit: 'visit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBIGE9ZbBjb3d5-9voI5-oTM6XSrIWwjN4hJ3-UxEXXMv89kxTyzxbIC0iGTUllid-6_mBRYckNcU-dIRxaxE5KAbUg1lMrkAFdpp1ux_8CiFoyJObEk6bZIPJTiEZJiLXreYdSb8bXOP8tuJsCbNANorfSeqoEsqrS7AHPudOZWU8_LV-Tm210hValALbkl7MZlj-GRyVwVPDBBmFRWXElRWxu0eUww1AmY9FXQrtjiSp2j5X4Oms8A', tags: ['Pipes', 'Leaks', 'Fittings'] },
  { id: 's3', name: 'Carpentry Services', category: 'Carpentry', icon: 'Hammer', color: 'amber', description: 'फर्नीचर की मरम्मत, दरवाजे और खिड़कियों का काम तथा लकड़ी की फिटिंग के लिए अनुभवी कारीगर उपलब्ध हैं।', basePrice: 300, unit: 'visit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqX_UQ8jTfoOiqvzd19oIRGHV-yVednmyY6iG4nqx55e77L3CkiZGZJgOqHN7656zJm9QN1sSQE2uVARgzcrrC9qwR0GG9Gi8JyJgHako3pDlbMOZ_MO6hy9qiJhXD8skNFtnTUBZi8W9yjT_MsWCV3uCcuE3xJSerqRU0ABmQJfWfdi2LP97cj28mjz5wQZpsjS-NFJ8aX85VqUR8FKPa6Rn6h-jBhiicvoC_CHW4ipYLf5lAhDQCSg', tags: ['Furniture', 'Doors', 'Repair'] },
  { id: 's4', name: 'Painting Services', category: 'Painting', icon: 'Paintbrush', color: 'rose', description: 'घर की आंतरिक और बाहरी पेंटिंग, टच-अप और सजावटी पेंटिंग के लिए प्रशिक्षित पेंटर उपलब्ध हैं।', basePrice: 150, unit: 'sqft', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0j3KEGOEDWmupsIR5D7H6zvCdajJfFiVcl1Uq28H-uOWfeMtSd_q0NRuUsA0XTHJ_flivqZ56UykcFXu5gs8stAI63MP0DDoj2sSTpqasLnmt-1t8KBTdXTdYs6kKM7WMNlrDLYNcsL13hOWeUoxWnqe3LTLZwxn4IM2-hiqAJJMyfzO1ZlibLi7IOLCtQFUFUYNxaagANqqrtBCdZYdRywgC2A5aO2rdPW_i-uXtqdaaXg2RSkS52zZbCS62Kr5N2Xs', tags: ['Interior', 'Exterior', 'Decorative'] },
  { id: 's5', name: 'Cleaning Services', category: 'Cleaning', icon: 'Sparkles', color: 'teal', description: 'घर की नियमित सफाई, डीप क्लीनिंग, रसोई और बाथरूम की सफाई के लिए विश्वसनीय सफाईकर्मी उपलब्ध हैं।', basePrice: 180, unit: 'visit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwAdzFkyuUIoT1YlOAxL74_Vo-o5OP20v7RFCG8D8QGISbRz9PgRuZwGY8vcImwsyAawXv1pj3tkKNPnX5D23mRZ0cG9sDZOYHRQyK65qQAwg7FOcP-sqP4BmilO6LpICOut2hEXcvuFLYcmH4Y87rJ_UEsJPZSHpzxPqnC_JIg6YxjPGCENaQHxq6p4a-VplKY9b54cSgkyTew-_hjIPnw2acydMCoolDRwd0EPccYL8tc-1KvHy2PO03FW5MN9I7o9s', tags: ['Deep Clean', 'Kitchen', 'Bathroom'] },
  { id: 's6', name: 'Driving Services', category: 'Driving', icon: 'Car', color: 'slate', description: 'स्थानीय यात्रा, व्यक्तिगत ड्राइविंग और सामान पहुंचाने के लिए सत्यापित ड्राइवर उपलब्ध हैं।', basePrice: 200, unit: 'hour', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbaYsmvc4r-rnDo3CxoKFtFtAqh-YMq1_uwQwT8rC5dvZr0w5-8W8YVy387IjuAi8RqAnj0s2XBhtRL09nRLv2s5lRQS1Xdj09B-Ynxu-tHgePy08TF88nPgD6YK_ZJvLqVSci0J1NCIMs1-mj0C6Fs9fYJN6Pn79z5Mcy1WWACcDjKe2Nsf-vNkVXvEBWTE-fzK5d6y2enBIpK9q9AVsepIY9FI__SdCbJDeCHBYjEINZgfe_eBvxrmG7JmxHpVSCh5c', tags: ['Local', 'Personal', 'Delivery'] },
  { id: 's7', name: 'Gardening & Landscaping', category: 'Outdoor', icon: 'Flower2', color: 'green', description: 'पौधों की देखभाल, लॉन की देखरेख, पेड़ों की छंटाई और लैंडस्केपिंग के लिए कुशल माली उपलब्ध हैं।', basePrice: 150, unit: 'visit', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqX_UQ8jTfoOiqvzd19oIRGHV-yVednmyY6iG4nqx55e77L3CkiZGZJgOqHN7656zJm9QN1sSQE2uVARgzcrrC9qwR0GG9Gi8JyJgHako3pDlbMOZ_MO6hy9qiJhXD8skNFtnTUBZi8W9yjT_MsWCV3uCcuE3xJSerqRU0ABmQJfWfdi2LP97cj28mjz5wQZpsjS-NFJ8aX85VqUR8FKPa6Rn6h-jBhiicvoC_CHW4ipYLf5lAhDQCSg', tags: ['Lawn', 'Pruning', 'Landscaping'] },
  { id: 's8', name: 'Caregiving Services', category: 'Caregiving', icon: 'HandHeart', color: 'yellow', description: 'बुजुर्गों की देखभाल, दैनिक गतिविधियों में सहायता और साथ रहने के लिए सत्यापित देखभालकर्ता उपलब्ध हैं।', basePrice: 300, unit: 'day', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0j3KEGOEDWmupsIR5D7H6zvCdajJfFiVcl1Uq28H-uOWfeMtSd_q0NRuUsA0XTHJ_flivqZ56UykcFXu5gs8stAI63MP0DDoj2sSTpqasLnmt-1t8KBTdXTdYs6kKM7WMNlrDLYNcsL13hOWeUoxWnqe3LTLZwxn4IM2-hiqAJJMyfzO1ZlibLi7IOLCtQFUFUYNxaagANqqrtBCdZYdRywgC2A5aO2rdPW_i-uXtqdaaXg2RSkS52zZbCS62Kr5N2Xs', tags: ['Elderly Care', 'Daily Help', 'Companion'] },
  { id: 's9', name: 'Domestic Helpers', category: 'Domestic', icon: 'House', color: 'coral', description: 'खाना बनाने, कपड़े धोने, घर की सफाई और दैनिक घरेलू कार्यों में सहायता के लिए घरेलू सहायक उपलब्ध हैं।', basePrice: 150, unit: 'hour', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwAdzFkyuUIoT1YlOAxL74_Vo-o5OP20v7RFCG8D8QGISbRz9PgRuZwGY8vcImwsyAawXv1pj3tkKNPnX5D23mRZ0cG9sDZOYHRQyK65qQAwg7FOcP-sqP4BmilO6LpICOut2hEXcvuFLYcmH4Y87rJ_UEsJPZSHpzxPqnC_JIg6YxjPGCENaQHxq6p4a-VplKY9b54cSgkyTew-_hjIPnw2acydMCoolDRwd0EPccYL8tc-1KvHy2PO03FW5MN9I7o9s', tags: ['Cooking', 'Laundry', 'Cleaning'] },
];

export const workers: Worker[] = [
  { id: 'w1', name: 'Lakshmi Devi', role: 'Domestic Helper & Cleaning', rating: 4.9, totalJobs: 120, experience: '5 Yrs Exp', distance: '1.2 km away', availability: 'Available Today', availableToday: true, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqX_UQ8jTfoOiqvzd19oIRGHV-yVednmyY6iG4nqx55e77L3CkiZGZJgOqHN7656zJm9QN1sSQE2uVARgzcrrC9qwR0GG9Gi8JyJgHako3pDlbMOZ_MO6hy9qiJhXD8skNFtnTUBZi8W9yjT_MsWCV3uCcuE3xJSerqRU0ABmQJfWfdi2LP97cj28mjz5wQZpsjS-NFJ8aX85VqUR8FKPa6Rn6h-jBhiicvoC_CHW4ipYLf5lAhDQCSg', society: 'Sewa Cooperative', skills: ['Cleaning', 'Cooking', 'Laundry'], bio: '5 years of experience in domestic help. Specializes in deep cleaning and Indian home cooking.', pricePerHour: 150, verified: true, status: 'online' },
  { id: 'w2', name: 'Rajesh Kumar', role: 'Expert Electrician', rating: 4.8, totalJobs: 85, experience: '8 Yrs Exp', distance: '2.5 km away', availability: 'Available Tomorrow', availableToday: false, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw', society: 'Bharat Workers Co-op', skills: ['Electrical', 'Wiring', 'Repair'], bio: 'Licensed electrician with 8 years of experience. Handles everything from wiring to appliance repair.', pricePerHour: 250, verified: true, status: 'online' },
  { id: 'w3', name: 'Amit Singh', role: 'Plumbing Specialist', rating: 4.7, totalJobs: 40, experience: '3 Yrs Exp', distance: '3.1 km away', availability: 'Available Today', availableToday: true, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDBIGE9ZbBjb3d5-9voI5-oTM6XSrIWwjN4hJ3-UxEXXMv89kxTyzxbIC0iGTUllid-6_mBRYckNcU-dIRxaxE5KAbUg1lMrkAFdpp1ux_8CiFoyJObEk6bZIPJTiEZJiLXreYdSb8bXOP8tuJsCbNANorfSeqoEsqrS7AHPudOZWU8_LV-Tm210hValALbkl7MZlj-GRyVwVPDBBmFRWXElRWxu0eUww1AmY9FXQrtjiSp2j5X4Oms8A', society: 'Sewa Cooperative', skills: ['Plumbing', 'Pipes', 'Fittings'], bio: 'Skilled plumber specializing in leak repairs, pipe fitting, and bathroom installations.', pricePerHour: 200, verified: true, status: 'busy' },
  { id: 'w4', name: 'Sunita Sharma', role: 'Caregiver & Nursing Aid', rating: 4.9, totalJobs: 65, experience: '6 Yrs Exp', distance: '1.8 km away', availability: 'Available Today', availableToday: true, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0j3KEGOEDWmupsIR5D7H6zvCdajJfFiVcl1Uq28H-uOWfeMtSd_q0NRuUsA0XTHJ_flivqZ56UykcFXu5gs8stAI63MP0DDoj2sSTpqasLnmt-1t8KBTdXTdYs6kKM7WMNlrDLYNcsL13hOWeUoxWnqe3LTLZwxn4IM2-hiqAJJMyfzO1ZlibLi7IOLCtQFUFUYNxaagANqqrtBCdZYdRywgC2A5aO2rdPW_i-uXtqdaaXg2RSkS52zZbCS62Kr5N2Xs', society: 'Seva Care Society', skills: ['Elderly Care', 'Nursing', 'Companion'], bio: 'Certified nursing assistant with 6 years of experience in elderly care and post-operative support.', pricePerHour: 300, verified: true, status: 'online' },
  { id: 'w5', name: 'Mohan Das', role: 'Carpenter & Furniture Maker', rating: 4.8, totalJobs: 95, experience: '10 Yrs Exp', distance: '4.2 km away', availability: 'Available Tomorrow', availableToday: false, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqX_UQ8jTfoOiqvzd19oIRGHV-yVednmyY6iG4nqx55e77L3CkiZGZJgOqHN7656zJm9QN1sSQE2uVARgzcrrC9qwR0GG9Gi8JyJgHako3pDlbMOZ_MO6hy9qiJhXD8skNFtnTUBZi8W9yjT_MsWCV3uCcuE3xJSerqRU0ABmQJfWfdi2LP97cj28mjz5wQZpsjS-NFJ8aX85VqUR8FKPa6Rn6h-jBhiicvoC_CHW4ipYLf5lAhDQCSg', society: 'Bharat Workers Co-op', skills: ['Carpentry', 'Furniture', 'Doors'], bio: 'Master carpenter with a decade of experience in custom furniture, door frames, and wood repair.', pricePerHour: 300, verified: true, status: 'offline' },
  { id: 'w6', name: 'Priya Patel', role: 'Painter & Decorator', rating: 4.6, totalJobs: 50, experience: '4 Yrs Exp', distance: '2.0 km away', availability: 'Available Today', availableToday: true, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwAdzFkyuUIoT1YlOAxL74_Vo-o5OP20v7RFCG8D8QGISbRz9PgRuZwGY8vcImwsyAawXv1pj3tkKNPnX5D23mRZ0cG9sDZOYHRQyK65qQAwg7FOcP-sqP4BmilO6LpICOut2hEXcvuFLYcmH4Y87rJ_UEsJPZSHpzxPqnC_JIg6YxjPGCENaQHxq6p4a-VplKY9b54cSgkyTew-_hjIPnw2acydMCoolDRwd0EPccYL8tc-1KvHy2PO03FW5MN9I7o9s', society: 'Rang Cooperative', skills: ['Painting', 'Decorative', 'Interior'], bio: 'Professional painter specializing in interior and exterior painting with decorative finishes.', pricePerHour: 150, verified: true, status: 'online' },
];

export const initialBookings: Booking[] = [
  { id: 'b1', serviceId: 's5', serviceName: 'Cleaning Services', workerId: 'w1', workerName: 'Lakshmi Devi', workerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqX_UQ8jTfoOiqvzd19oIRGHV-yVednmyY6iG4nqx55e77L3CkiZGZJgOqHN7656zJm9QN1sSQE2uVARgzcrrC9qwR0GG9Gi8JyJgHako3pDlbMOZ_MO6hy9qiJhXD8skNFtnTUBZi8W9yjT_MsWCV3uCcuE3xJSerqRU0ABmQJfWfdi2LP97cj28mjz5wQZpsjS-NFJ8aX85VqUR8FKPa6Rn6h-jBhiicvoC_CHW4ipYLf5lAhDQCSg', clientId: 'c1', clientName: 'Ananya Sharma', clientImage: 'AS', date: '2026-09-04', time: '10:00 AM', address: 'Flat 302, Sunrise Apartments, Bandra West, Mumbai', price: 540, status: 'accepted', otp: '4821', createdAt: '2026-09-02T10:30:00Z' },
  { id: 'b2', serviceId: 's1', serviceName: 'Electrical Services', workerId: 'w2', workerName: 'Rajesh Kumar', workerImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAClkBPhMbnqYSRWOSFN2NOc_VEGKH2EBE5OxYSzztUMRby_8mqW11lK7rNpGQBtBGqRprR_zbPys0SuXFVTSkNqhumPiJOaCoKNVF2-T1XN1IFzeS4_2GWxlhe8WkmBiVZVjlapqdBuDjss-JuZGltpLPqxQ5Ue9zNRFnRbJF2_t_gbOtVVjxDoZuWNdUeOD-GYV2An1NDYYg5ae8rMnkjv1aRErqfFIRPBWhaljWbuGJNFvXxQ5QWNw', clientId: 'c1', clientName: 'Ananya Sharma', clientImage: 'AS', date: '2026-09-05', time: '2:00 PM', address: 'Flat 302, Sunrise Apartments, Bandra West, Mumbai', price: 500, status: 'completed', otp: '1937', createdAt: '2026-09-01T14:00:00Z', rating: 5, reviewText: 'Rajesh was very professional and fixed the wiring quickly. Highly recommended!' },
];

export const initialChatMessages: ChatMessage[] = [
  { id: 'm1', bookingId: 'b1', sender: 'worker', text: 'Namaste! I will arrive at 10 AM tomorrow. Is there anything specific I should bring?', timestamp: '2026-09-03T09:15:00Z' },
  { id: 'm2', bookingId: 'b1', sender: 'client', text: 'Namaste! Yes, please bring extra cleaning cloths. The kitchen needs deep cleaning.', timestamp: '2026-09-03T09:22:00Z' },
  { id: 'm3', bookingId: 'b1', sender: 'worker', text: 'Sure, I will bring everything needed. See you tomorrow!', timestamp: '2026-09-03T09:25:00Z' },
];

export const openGigs: Gig[] = [
  { id: 'g1', serviceId: 's1', serviceName: 'Electrical Services', clientId: 'c2', clientName: 'Vikram Mehta', clientImage: 'VM', address: 'Shop 12, Linking Road, Bandra West, Mumbai', date: '2026-09-04', time: '11:00 AM', price: 500, duration: '2 hours', status: 'open', description: 'Need electrician for shop wiring check and 3 new socket installations.', distance: '1.5 km' },
  { id: 'g2', serviceId: 's2', serviceName: 'Plumbing Services', clientId: 'c3', clientName: 'Sneha Reddy', clientImage: 'SR', address: 'Bungalow 45, Pali Hill, Bandra West, Mumbai', date: '2026-09-04', time: '9:00 AM', price: 400, duration: '1.5 hours', status: 'open', description: 'Kitchen sink pipe leaking, needs urgent repair.', distance: '2.8 km' },
  { id: 'g3', serviceId: 's5', serviceName: 'Cleaning Services', clientId: 'c4', clientName: 'Arjun Nair', clientImage: 'AN', address: 'Flat 501, Sea View Apartments, Bandra West, Mumbai', date: '2026-09-05', time: '8:00 AM', price: 720, duration: '4 hours', status: 'open', description: 'Full apartment deep cleaning — 3BHK, 2 bathrooms, kitchen.', distance: '3.2 km' },
  { id: 'g4', serviceId: 's3', serviceName: 'Carpentry Services', clientId: 'c5', clientName: 'Fatima Khan', clientImage: 'FK', address: 'Flat 102, Hill Road, Bandra West, Mumbai', date: '2026-09-06', time: '10:00 AM', price: 900, duration: '3 hours', status: 'open', description: 'Wardrobe door hinge broken, needs replacement. Also need a small shelf installed.', distance: '1.9 km' },
  { id: 'g5', serviceId: 's8', serviceName: 'Caregiving Services', clientId: 'c6', clientName: 'Rohit Gupta', clientImage: 'RG', address: 'Flat 201, Carter Road, Bandra West, Mumbai', date: '2026-09-07', time: '7:00 AM', price: 2400, duration: '8 hours', status: 'open', description: 'Need a caregiver for elderly mother for the day — medication reminders, meals, and companionship.', distance: '4.5 km' },
];

export const societies: Society[] = [
  { id: 'soc1', name: 'Sewa Cooperative', members: 245, activeWorkers: 180, totalEarnings: 485000, dividendPool: 48500, status: 'active', location: 'Bandra West, Mumbai', established: '2019' },
  { id: 'soc2', name: 'Bharat Workers Co-op', members: 180, activeWorkers: 142, totalEarnings: 392000, dividendPool: 39200, status: 'active', location: 'Andheri East, Mumbai', established: '2020' },
  { id: 'soc3', name: 'Seva Care Society', members: 95, activeWorkers: 78, totalEarnings: 218000, dividendPool: 21800, status: 'active', location: 'Dadar, Mumbai', established: '2021' },
  { id: 'soc4', name: 'Rang Cooperative', members: 60, activeWorkers: 45, totalEarnings: 134000, dividendPool: 13400, status: 'pending', location: 'Juhu, Mumbai', established: '2023' },
  { id: 'soc5', name: 'Shramik Sahyog', members: 120, activeWorkers: 0, totalEarnings: 0, dividendPool: 0, status: 'review', location: 'Goregaon, Mumbai', established: '2024' },
];

export const dividendRecords: DividendRecord[] = [
  { id: 'd1', societyId: 'soc1', societyName: 'Sewa Cooperative', workerName: 'Lakshmi Devi', amount: 2400, date: '2026-08-15', quarter: 'Q2 2026', status: 'paid' },
  { id: 'd2', societyId: 'soc1', societyName: 'Sewa Cooperative', workerName: 'Amit Singh', amount: 1850, date: '2026-08-15', quarter: 'Q2 2026', status: 'paid' },
  { id: 'd3', societyId: 'soc2', societyName: 'Bharat Workers Co-op', workerName: 'Rajesh Kumar', amount: 3200, date: '2026-08-15', quarter: 'Q2 2026', status: 'paid' },
  { id: 'd4', societyId: 'soc2', societyName: 'Bharat Workers Co-op', workerName: 'Mohan Das', amount: 2800, date: '2026-08-15', quarter: 'Q2 2026', status: 'paid' },
  { id: 'd5', societyId: 'soc3', societyName: 'Seva Care Society', workerName: 'Sunita Sharma', amount: 2100, date: '2026-08-15', quarter: 'Q2 2026', status: 'paid' },
  { id: 'd6', societyId: 'soc4', societyName: 'Rang Cooperative', workerName: 'Priya Patel', amount: 1200, date: '2026-09-15', quarter: 'Q3 2026', status: 'pending' },
  { id: 'd7', societyId: 'soc1', societyName: 'Sewa Cooperative', workerName: 'Lakshmi Devi', amount: 2600, date: '2026-09-15', quarter: 'Q3 2026', status: 'pending' },
  { id: 'd8', societyId: 'soc2', societyName: 'Bharat Workers Co-op', workerName: 'Rajesh Kumar', amount: 3400, date: '2026-09-15', quarter: 'Q3 2026', status: 'pending' },
];

export const demandHeatmap: DemandCell[] = [
  { area: 'Bandra West', category: 'Electrical', demand: 85, supply: 60, gap: 25 },
  { area: 'Bandra West', category: 'Plumbing', demand: 70, supply: 55, gap: 15 },
  { area: 'Bandra West', category: 'Cleaning', demand: 92, supply: 78, gap: 14 },
  { area: 'Bandra West', category: 'Carpentry', demand: 60, supply: 45, gap: 15 },
  { area: 'Andheri East', category: 'Electrical', demand: 78, supply: 65, gap: 13 },
  { area: 'Andheri East', category: 'Plumbing', demand: 65, supply: 50, gap: 15 },
  { area: 'Andheri East', category: 'Cleaning', demand: 88, supply: 70, gap: 18 },
  { area: 'Andheri East', category: 'Painting', demand: 55, supply: 40, gap: 15 },
  { area: 'Dadar', category: 'Electrical', demand: 60, supply: 55, gap: 5 },
  { area: 'Dadar', category: 'Caregiving', demand: 82, supply: 48, gap: 34 },
  { area: 'Dadar', category: 'Cleaning', demand: 70, supply: 60, gap: 10 },
  { area: 'Juhu', category: 'Painting', demand: 75, supply: 35, gap: 40 },
  { area: 'Juhu', category: 'Gardening', demand: 68, supply: 30, gap: 38 },
  { area: 'Juhu', category: 'Cleaning', demand: 80, supply: 50, gap: 30 },
  { area: 'Goregaon', category: 'Plumbing', demand: 72, supply: 40, gap: 32 },
  { area: 'Goregaon', category: 'Electrical', demand: 65, supply: 38, gap: 27 },
];

export const heroImages = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDbaYsmvc4r-rnDo3CxoKFtFtAqh-YMq1_uwQwT8rC5dvZr0w5-8W8YVy387IjuAi8RqAnj0s2XBhtRL09nRLv2s5lRQS1Xdj09B-Ynxu-tHgePy08TF88nPgD6YK_ZJvLqVSci0J1NCIMs1-mj0C6Fs9fYJN6Pn79z5Mcy1WWACcDjKe2Nsf-vNkVXvEBWTE-fzK5d6y2enBIpK9q9AVsepIY9FI__SdCbJDeCHBYjEINZgfe_eBvxrmG7JmxHpVSCh5c',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDwAdzFkyuUIoT1YlOAxL74_Vo-o5OP20v7RFCG8D8QGISbRz9PgRuZwGY8vcImwsyAawXv1pj3tkKNPnX5D23mRZ0cG9sDZOYHRQyK65qQAwg7FOcP-sqP4BmilO6LpICOut2hEXcvuFLYcmH4Y87rJ_UEsJPZSHpzxPqnC_JIg6YxjPGCENaQHxq6p4a-VplKY9b54cSgkyTew-_hjIPnw2acydMCoolDRwd0EPccYL8tc-1KvHy2PO03FW5MN9I7o9s',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB0j3KEGOEDWmupsIR5D7H6zvCdajJfFiVcl1Uq28H-uOWfeMtSd_q0NRuUsA0XTHJ_flivqZ56UykcFXu5gs8stAI63MP0DDoj2sSTpqasLnmt-1t8KBTdXTdYs6kKM7WMNlrDLYNcsL13hOWeUoxWnqe3LTLZwxn4IM2-hiqAJJMyfzO1ZlibLi7IOLCtQFUFUYNxaagANqqrtBCdZYdRywgC2A5aO2rdPW_i-uXtqdaaXg2RSkS52zZbCS62Kr5N2Xs',
];

export const kycSteps: { id: string; title: string }[] = [
  { id: 'k1', title: 'Personal Identity' },
  { id: 'k2', title: 'Address Verification' },
  { id: 'k3', title: 'Skill Certification' },
  { id: 'k4', title: 'Cooperative Membership' },
  { id: 'k5', title: 'Bank Details' },
];

export const workerEarnings = {
  total: 28400,
  thisMonth: 6200,
  thisWeek: 1800,
  pendingPayout: 1200,
  jobsCompleted: 23,
  averageRating: 4.8,
  hourlyRate: 250,
  monthlyHistory: [
    { month: 'Apr', amount: 4200 }, { month: 'May', amount: 5100 },
    { month: 'Jun', amount: 4800 }, { month: 'Jul', amount: 5600 },
    { month: 'Aug', amount: 6500 }, { month: 'Sep', amount: 2200 },
  ],
};
