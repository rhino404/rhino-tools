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
  },
  {
    question: "What is the difference between bagging and boosting?",
    choices: [
      "Bagging uses sequential models, boosting uses parallel models",
      "Bagging combines weak learners in parallel, boosting combines them sequentially",
      "Bagging is only for regression, boosting is only for classification",
      "Bagging reduces bias, boosting increases variance"
    ],
    correct: "Bagging combines weak learners in parallel, boosting combines them sequentially",
    explanation: "Bagging builds models independently and averages them; boosting builds models sequentially to correct errors.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which technique is commonly used for feature selection?",
    choices: [
      "Random Forest importance",
      "Gradient Descent",
      "K-Means clustering",
      "Cross-validation"
    ],
    correct: "Random Forest importance",
    explanation: "Random Forests can rank features by importance, aiding feature selection.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of the ROC curve?",
    choices: [
      "To show the trade-off between precision and recall",
      "To visualize the performance of a classification model at all thresholds",
      "To measure regression error",
      "To select hyperparameters"
    ],
    correct: "To visualize the performance of a classification model at all thresholds",
    explanation: "ROC curves plot true positive rate vs. false positive rate for different thresholds.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which regularization technique adds a penalty for large coefficients?",
    choices: [
      "Dropout",
      "L1/L2 regularization",
      "Batch normalization",
      "Early stopping"
    ],
    correct: "L1/L2 regularization",
    explanation: "L1 and L2 regularization penalize large weights to prevent overfitting.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is the main advantage of using a validation set?",
    choices: [
      "It increases training accuracy",
      "It helps tune hyperparameters and prevent overfitting",
      "It reduces the size of the test set",
      "It is used for unsupervised learning"
    ],
    correct: "It helps tune hyperparameters and prevent overfitting",
    explanation: "A validation set is used to evaluate model performance during training and tune hyperparameters.",
    level: "intermediate",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which optimization algorithm is commonly used for training deep neural networks?",
    choices: [
      "Gradient Descent",
      "Adam",
      "K-Means",
      "PCA"
    ],
    correct: "Adam",
    explanation: "Adam is an adaptive optimization algorithm widely used for deep learning.",
    level: "advanced",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is the vanishing gradient problem?",
    choices: [
      "Gradients become too large during training",
      "Gradients become too small, slowing or stopping learning in deep networks",
      "Gradients oscillate between positive and negative values",
      "Gradients are only used in unsupervised learning"
    ],
    correct: "Gradients become too small, slowing or stopping learning in deep networks",
    explanation: "Vanishing gradients make it difficult for deep networks to learn long-range dependencies.",
    level: "advanced",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which type of neural network is best suited for sequential data?",
    choices: [
      "Convolutional Neural Network",
      "Recurrent Neural Network",
      "Random Forest",
      "Decision Tree"
    ],
    correct: "Recurrent Neural Network",
    explanation: "RNNs are designed to handle sequential data such as time series or text.",
    level: "advanced",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "What is transfer learning?",
    choices: [
      "Training a model from scratch",
      "Using a pre-trained model and adapting it to a new task",
      "Combining multiple models",
      "Reducing the number of features"
    ],
    correct: "Using a pre-trained model and adapting it to a new task",
    explanation: "Transfer learning leverages knowledge from existing models for new, related tasks.",
    level: "advanced",
    category: "ml",
    type: "multiple-choice"
  },
  {
    question: "Which metric is best for evaluating models on imbalanced datasets?",
    choices: [
      "Accuracy",
      "F1 Score",
      "Mean Squared Error",
      "R-squared"
    ],
    correct: "F1 Score",
    explanation: "F1 Score balances precision and recall, making it suitable for imbalanced classification problems.",
    level: "advanced",
    category: "ml",
    type: "multiple-choice"
  }
];