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
  },
  {
    question: "What is the difference between stemming and lemmatization?",
    choices: [
      "Stemming removes stop words, lemmatization encodes text",
      "Stemming cuts off word endings, lemmatization finds the dictionary form",
      "They are the same process",
      "Stemming is used for tokenization"
    ],
    correct: "Stemming cuts off word endings, lemmatization finds the dictionary form",
    explanation: "Stemming crudely removes word endings, while lemmatization uses vocabulary and morphology analysis.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which technique helps reduce the dimensionality of text data?",
    choices: [
      "TF-IDF",
      "Principal Component Analysis (PCA)",
      "Bag of Words",
      "Word2Vec"
    ],
    correct: "Principal Component Analysis (PCA)",
    explanation: "PCA is a dimensionality reduction technique often used after vectorizing text.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is the main purpose of the attention mechanism in NLP models?",
    choices: [
      "To encode categorical variables",
      "To focus on relevant parts of the input sequence",
      "To normalize input features",
      "To remove stop words"
    ],
    correct: "To focus on relevant parts of the input sequence",
    explanation: "Attention allows models to weigh different parts of the input sequence differently.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which method is commonly used for sentiment analysis?",
    choices: [
      "Topic modeling",
      "Classification",
      "Clustering",
      "Regression"
    ],
    correct: "Classification",
    explanation: "Sentiment analysis is typically framed as a classification problem.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What does the term 'out-of-vocabulary' (OOV) mean in NLP?",
    choices: [
      "Words not present in the training vocabulary",
      "Words with multiple meanings",
      "Words that are stop words",
      "Words that are named entities"
    ],
    correct: "Words not present in the training vocabulary",
    explanation: "OOV refers to words that the model has not seen during training.",
    level: "intermediate",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which model is commonly used for sequence-to-sequence tasks in NLP?",
    choices: [
      "Random Forest",
      "Seq2Seq with attention",
      "K-Means",
      "Logistic Regression"
    ],
    correct: "Seq2Seq with attention",
    explanation: "Seq2Seq models with attention are widely used for tasks like translation and summarization.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is the main advantage of using BERT over traditional word embeddings?",
    choices: [
      "BERT provides static word vectors",
      "BERT captures context-dependent meanings",
      "BERT is only used for image processing",
      "BERT ignores word order"
    ],
    correct: "BERT captures context-dependent meanings",
    explanation: "BERT generates embeddings that depend on the context of the word in the sentence.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which evaluation metric is best for imbalanced text classification?",
    choices: [
      "Accuracy",
      "F1 Score",
      "BLEU Score",
      "Mean Squared Error"
    ],
    correct: "F1 Score",
    explanation: "F1 Score balances precision and recall, making it suitable for imbalanced datasets.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "What is transfer learning in NLP?",
    choices: [
      "Training a model from scratch",
      "Using a pre-trained model and fine-tuning it for a specific task",
      "Removing stop words",
      "Encoding text as one-hot vectors"
    ],
    correct: "Using a pre-trained model and fine-tuning it for a specific task",
    explanation: "Transfer learning leverages knowledge from pre-trained models for new tasks.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  },
  {
    question: "Which technique is used to generate text automatically?",
    choices: [
      "Text classification",
      "Text generation with language models",
      "Text clustering",
      "Text normalization"
    ],
    correct: "Text generation with language models",
    explanation: "Language models like GPT are used for automatic text generation.",
    level: "advanced",
    category: "nlp",
    type: "multiple-choice"
  }
];