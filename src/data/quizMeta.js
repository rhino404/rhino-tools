// quizMeta.js

export const categories = [
    { label: "Ham Radio", value: "ham-radio" },
    { label: "Cybersecurity", value: "cybersecurity" },
    { label: "Falconry", value: "falconry" },
    { label: "DevOps", value: "devops" },
    // add more as needed
];

export const subcategories = [
    { label: "Technician", value: "technician", category: "ham-radio" },
    { label: "General", value: "general", category: "ham-radio" },
    { label: "Extra", value: "extra", category: "ham-radio" },
    { label: "Security+ SY0-701", value: "security+ sy0-701", category: "cybersecurity" },
    { label: "Apprentice", value: "apprentice", category: "falconry" },
    { label: "Core Concepts & Culture", value: "core-concepts", category: "devops" },
    { label: "Containers & Kubernetes", value: "containers-k8s", category: "devops" },
];

export const quizMeta = {
    categories,
    subcategories,
};

export const getCategoryIcon = {
    "all": "🌐",
    "ham-radio": "📻",
    "cybersecurity": "🛡️",
    "falconry": "🦅",
    "devops": "⚙️",
    // Add more category-icon pairs here
};

