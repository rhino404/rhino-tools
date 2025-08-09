// quizMeta.js

export const categories = [
    { label: "Ham Radio", value: "ham-radio" },
    // add more as needed
];

export const subcategories = [
    { label: "Technician", value: "technician", category: "ham-radio" },
    { label: "General", value: "general", category: "ham-radio" },
    { label: "Extra", value: "extra", category: "ham-radio" },
];

export const quizMeta = {
    categories,
    subcategories,
};

export const getCategoryIcon = {
    "all": "🌐",
    "ham-radio": "📡",
    // Add more category-icon pairs here
};

