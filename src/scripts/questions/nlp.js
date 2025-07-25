export const nlpQuestions = [
  {
    question: "What is the role of the 'embedding layer' in natural language processing models?",
    choices: [
      "To encode categorical variables",
      "To convert words into dense vector representations",
      "To reduce overfitting",
      "To normalize input features"
    ],
    correct: "To convert words into dense vector representations",
    explanation: "Embedding layers map words to dense vectors, capturing semantic meaning for NLP tasks.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which algorithm is commonly used for text classification?",
    choices: [
      "K-Means",
      "Naive Bayes",
      "Linear Regression",
      "PCA"
    ],
    correct: "Naive Bayes",
    explanation: "Naive Bayes is a popular algorithm for text classification tasks due to its simplicity and effectiveness.",
    level: "beginner",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What does 'tokenization' mean in NLP?",
    choices: [
      "Splitting text into sentences or words",
      "Encoding text into numbers",
      "Removing stop words",
      "Normalizing text"
    ],
    correct: "Splitting text into sentences or words",
    explanation: "Tokenization is the process of breaking text into smaller units such as words or sentences.",
    level: "beginner",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which technique is used to remove common words like 'the', 'is', 'and' from text?",
    choices: [
      "Stemming",
      "Stop word removal",
      "Tokenization",
      "Lemmatization"
    ],
    correct: "Stop word removal",
    explanation: "Stop word removal eliminates frequently used words that may not carry significant meaning.",
    level: "beginner",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is the main purpose of stemming in NLP?",
    choices: [
      "To convert words to their base or root form",
      "To encode words as vectors",
      "To remove punctuation",
      "To classify text"
    ],
    correct: "To convert words to their base or root form",
    explanation: "Stemming reduces words to their root form, helping to group similar words together.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which model architecture is widely used for machine translation?",
    choices: [
      "Convolutional Neural Network",
      "Recurrent Neural Network",
      "Transformer",
      "Decision Tree"
    ],
    correct: "Transformer",
    explanation: "Transformer models are state-of-the-art for machine translation and other NLP tasks.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is named entity recognition (NER)?",
    choices: [
      "Identifying the sentiment of text",
      "Classifying documents",
      "Detecting and classifying entities like names, locations, and dates in text",
      "Translating text"
    ],
    correct: "Detecting and classifying entities like names, locations, and dates in text",
    explanation: "NER locates and categorizes entities in text, such as people, organizations, and places.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which metric is commonly used to evaluate text similarity?",
    choices: [
      "BLEU score",
      "Accuracy",
      "Recall",
      "Mean Squared Error"
    ],
    correct: "BLEU score",
    explanation: "BLEU score is widely used to evaluate the quality of machine-generated text against reference text.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of lemmatization in NLP?",
    choices: [
      "To remove stop words",
      "To convert words to their dictionary form",
      "To encode text as vectors",
      "To split text into tokens"
    ],
    correct: "To convert words to their dictionary form",
    explanation: "Lemmatization reduces words to their dictionary form, improving text normalization.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which library is commonly used for NLP tasks in Python?",
    choices: [
      "TensorFlow",
      "NLTK",
      "Matplotlib",
      "Scikit-learn"
    ],
    correct: "NLTK",
    explanation: "NLTK is a popular Python library for natural language processing tasks.",
    level: "beginner",
    category: "nlp",
    type: "multiple-choice"
  }
];