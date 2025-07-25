export const mlQuestions = [
  {
    question: "What is the primary goal of supervised learning?",
    choices: [
      "To find hidden patterns in unlabeled data",
      "To predict outputs based on labeled input data",
      "To generate new data samples",
      "To cluster data into groups"
    ],
    correct: "To predict outputs based on labeled input data",
    explanation: "Supervised learning uses labeled data to train models to predict outputs.",
    level: "beginner",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which algorithm is commonly used for classification tasks?",
    choices: [
      "K-Means",
      "Linear Regression",
      "Decision Tree",
      "PCA"
    ],
    correct: "Decision Tree",
    explanation: "Decision Trees are widely used for classification problems in machine learning.",
    level: "beginner",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What does 'overfitting' mean in machine learning?",
    choices: [
      "Model performs well on training data but poorly on new data",
      "Model performs well on all data",
      "Model is too simple",
      "Model uses too little data"
    ],
    correct: "Model performs well on training data but poorly on new data",
    explanation: "Overfitting happens when a model learns the training data too well and fails to generalize.",
    level: "beginner",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which metric is commonly used to evaluate regression models?",
    choices: [
      "Accuracy",
      "F1 Score",
      "Mean Squared Error",
      "Recall"
    ],
    correct: "Mean Squared Error",
    explanation: "Mean Squared Error (MSE) measures the average squared difference between predicted and actual values.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is the main purpose of cross-validation?",
    choices: [
      "To increase training speed",
      "To tune hyperparameters",
      "To assess model generalization",
      "To reduce data size"
    ],
    correct: "To assess model generalization",
    explanation: "Cross-validation helps estimate how well a model will perform on unseen data.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which technique is used to reduce the dimensionality of data?",
    choices: [
      "Random Forest",
      "Principal Component Analysis",
      "Gradient Descent",
      "Bagging"
    ],
    correct: "Principal Component Analysis",
    explanation: "PCA is a technique for reducing the number of features in a dataset.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is an ensemble method in machine learning?",
    choices: [
      "A single model trained on all data",
      "Combining multiple models to improve performance",
      "Using only deep learning models",
      "Training models without labels"
    ],
    correct: "Combining multiple models to improve performance",
    explanation: "Ensemble methods combine predictions from several models to achieve better results.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which algorithm is best suited for clustering?",
    choices: [
      "Support Vector Machine",
      "K-Means",
      "Logistic Regression",
      "Random Forest"
    ],
    correct: "K-Means",
    explanation: "K-Means is a popular unsupervised algorithm for clustering data into groups.",
    level: "beginner",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is a hyperparameter in machine learning?",
    choices: [
      "A parameter learned during training",
      "A parameter set before training",
      "A feature in the dataset",
      "A type of loss function"
    ],
    correct: "A parameter set before training",
    explanation: "Hyperparameters are set prior to training and control the learning process.",
    level: "beginner",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which method helps prevent overfitting in neural networks?",
    choices: [
      "Increasing the number of layers",
      "Using dropout",
      "Using more epochs",
      "Reducing the dataset size"
    ],
    correct: "Using dropout",
    explanation: "Dropout randomly disables neurons during training, helping prevent overfitting.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  }
];