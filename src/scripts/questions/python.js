export const pythonQuestions = [
  {
    question: "What does the following Python code output?\n\nprint([i**2 for i in range(3)])",
    choices: [
      "[1, 4, 9]",
      "[0, 1, 4]",
      "[0, 1, 2]",
      "[2, 4, 6]"
    ],
    correct: "[0, 1, 4]",
    explanation: "The list comprehension squares each number in range(3), which is [0, 1, 4].",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which Python library is commonly used for data manipulation and analysis?",
    choices: [
      "NumPy",
      "Pandas",
      "Matplotlib",
      "Scikit-learn"
    ],
    correct: "Pandas",
    explanation: "Pandas provides data structures and functions for efficient data manipulation and analysis.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What is the output of: print(type({}))",
    choices: [
      "<class 'list'>",
      "<class 'dict'>",
      "<class 'set'>",
      "<class 'tuple'>"
    ],
    correct: "<class 'dict'>",
    explanation: "Empty curly braces create a dictionary in Python.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which keyword is used to define a function in Python?",
    choices: [
      "func",
      "def",
      "function",
      "define"
    ],
    correct: "def",
    explanation: "The 'def' keyword is used to define functions in Python.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "How do you import the NumPy library using common convention?",
    choices: [
      "import numpy",
      "import numpy as np",
      "import np",
      "include numpy"
    ],
    correct: "import numpy as np",
    explanation: "The common convention is to import NumPy as 'np'.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What does the 'len' function do in Python?",
    choices: [
      "Returns the length of an object",
      "Returns the type of an object",
      "Returns the value of an object",
      "Returns the index of an object"
    ],
    correct: "Returns the length of an object",
    explanation: "'len' returns the number of items in an object like a list or string.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which statement is used to handle exceptions in Python?",
    choices: [
      "try/except",
      "catch/throw",
      "error/handle",
      "do/catch"
    ],
    correct: "try/except",
    explanation: "Python uses 'try' and 'except' blocks to handle exceptions.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What is the output of: print('Hello' + 'World')",
    choices: [
      "Hello World",
      "HelloWorld",
      "Hello+World",
      "Error"
    ],
    correct: "HelloWorld",
    explanation: "The '+' operator concatenates strings in Python.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which method is used to add an item to a list?",
    choices: [
      "add()",
      "append()",
      "insert()",
      "push()"
    ],
    correct: "append()",
    explanation: "'append()' adds an item to the end of a list.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What does the following code do?\n\nfor i in range(5): print(i)",
    choices: [
      "Prints numbers 1 to 5",
      "Prints numbers 0 to 4",
      "Prints numbers 0 to 5",
      "Prints numbers 1 to 4"
    ],
    correct: "Prints numbers 0 to 4",
    explanation: "range(5) generates numbers from 0 to 4.",
    level: "beginner",
    category: "python",
    type: "multiple-choice"
  }
];