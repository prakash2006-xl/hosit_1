export const SAMPLE_LABS = [
    {
        id: 1,
        name: 'Hosit Diagnostics',
        rating: 4.8,
        address: 'MG Road, Bengaluru',
        distance: 2.4,
        openingHours: '7:00 AM - 8:00 PM',
        contactNumber: '+91 90000 11111',
        homeCollection: true,
        openNow: true,
        description: 'Full-service preventive health laboratory with home sample collection and fast reporting.',
        tests: [
            { id: 'cbc', name: 'CBC', price: 350, resultTime: '6 Hours' },
            { id: 'hba1c', name: 'HbA1c', price: 450, resultTime: '12 Hours' },
            { id: 'lipid', name: 'Lipid Profile', price: 650, resultTime: '24 Hours' },
            { id: 'thyroid', name: 'Thyroid Profile', price: 600, resultTime: '24 Hours' },
            { id: 'vitd', name: 'Vitamin D', price: 900, resultTime: '24 Hours' }
        ]
    },
    {
        id: 2,
        name: 'CityCare Labs',
        rating: 4.5,
        address: 'Indiranagar, Bengaluru',
        distance: 4.1,
        openingHours: '8:00 AM - 7:00 PM',
        contactNumber: '+91 90000 22222',
        homeCollection: true,
        openNow: true,
        description: 'Accredited lab for routine blood tests, diabetic panels, and heart health packages.',
        tests: [
            { id: 'cbc', name: 'CBC', price: 320, resultTime: '8 Hours' },
            { id: 'fbs', name: 'Fasting Blood Sugar', price: 180, resultTime: '4 Hours' },
            { id: 'lipid', name: 'Lipid Profile', price: 700, resultTime: '24 Hours' },
            { id: 'lft', name: 'Liver Function Test', price: 750, resultTime: '24 Hours' }
        ]
    },
    {
        id: 3,
        name: 'WellPath Laboratory',
        rating: 4.3,
        address: 'Koramangala, Bengaluru',
        distance: 6.8,
        openingHours: '9:00 AM - 6:00 PM',
        contactNumber: '+91 90000 33333',
        homeCollection: false,
        openNow: false,
        description: 'Fast reporting for preventive screening packages and scanned report uploads.',
        tests: [
            { id: 'thyroid', name: 'Thyroid Profile', price: 580, resultTime: '24 Hours' },
            { id: 'kidney', name: 'Kidney Function Test', price: 800, resultTime: '24 Hours' },
            { id: 'vitd', name: 'Vitamin D', price: 850, resultTime: '24 Hours' }
        ]
    }
];

export const MEAL_TYPES = ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'];

export const DEFAULT_DIET_PLAN = {
    id: 'local-default',
    dietName: 'Preventive Wellness Plan',
    doctorName: 'Dr. Hosit Care',
    issueDate: '2026-07-11',
    expiryDate: '2026-08-10',
    goal: 'Heart Health',
    dailyGoals: {
        calories: 1900,
        protein: 75,
        carbs: 220,
        fat: 60,
        fiber: 30,
        water: 2500
    },
    meals: {
        Breakfast: 'Oats with milk, nuts, and one fruit',
        'Morning Snack': 'Sprouts or curd with cucumber',
        Lunch: 'Brown rice or chapati, dal, vegetables, salad',
        'Evening Snack': 'Roasted chana or fruit',
        Dinner: 'Light khichdi, vegetables, or grilled paneer'
    },
    allowedFoods: 'Whole grains, dal, vegetables, fruits, nuts, curd',
    avoidFoods: 'Sugary drinks, fried snacks, excess salt, late-night heavy meals',
    instructions: 'This is general nutrition guidance. Follow your doctor or dietitian for condition-specific changes.'
};
