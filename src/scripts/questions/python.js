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
    question: "What is the output of: print(type([]))",
    choices: [
      "<class 'list'>",
      "<class 'dict'>",
      "<class 'set'>",
      "<class 'tuple'>"
    ],
    correct: "<class 'list'>",
    explanation: "Empty square brackets create a list in Python.",
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
  },
  {
    question: "Which of the following statements about Python decorators is true?",
    choices: [
      "They modify the behavior of functions or classes",
      "They are used only for error handling",
      "They are a type of loop",
      "They can only be applied to methods"
    ],
    correct: "They modify the behavior of functions or classes",
    explanation: "Decorators are used to extend or modify the behavior of functions or classes.",
    level: "intermediate",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What is the result of the following code?\n\nx = [1, 2, 3]\ny = x\nx.append(4)\nprint(y)",
    choices: [
      "[1, 2, 3]",
      "[1, 2, 3, 4]",
      "[4]",
      "Error"
    ],
    correct: "[1, 2, 3, 4]",
    explanation: "y references the same list as x, so changes to x affect y.",
    level: "intermediate",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which built-in function can be used to sort a list in place?",
    choices: [
      "sort()",
      "sorted()",
      "order()",
      "arrange()"
    ],
    correct: "sort()",
    explanation: "'sort()' sorts a list in place, while 'sorted()' returns a new sorted list.",
    level: "intermediate",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What does the following code output?\n\nprint({x: x**2 for x in range(3)})",
    choices: [
      "{0: 0, 1: 1, 2: 4}",
      "[0, 1, 4]",
      "{1: 1, 2: 4, 3: 9}",
      "Error"
    ],
    correct: "{0: 0, 1: 1, 2: 4}",
    explanation: "Dictionary comprehension creates a dictionary mapping x to x squared for x in range(3).",
    level: "intermediate",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which of the following is NOT a valid way to create a NumPy array?",
    choices: [
      "np.array([1, 2, 3])",
      "np.arange(3)",
      "np.list([1, 2, 3])",
      "np.zeros(3)"
    ],
    correct: "np.list([1, 2, 3])",
    explanation: "NumPy does not have a 'list' function; use 'array', 'arange', or 'zeros'.",
    level: "advanced",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What is the output of the following code?\n\ndef foo(a, b=2, c=3):\n    return a + b + c\nprint(foo(1, c=4))",
    choices: [
      "7",
      "6",
      "5",
      "Error"
    ],
    correct: "7",
    explanation: "a=1, b=2 (default), c=4 (overridden), so 1+2+4=7.",
    level: "advanced",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which statement about Python's GIL (Global Interpreter Lock) is correct?",
    choices: [
      "It prevents multiple threads from executing Python bytecodes at once",
      "It allows true parallelism in multi-threaded programs",
      "It is only present in Python 2",
      "It is used for memory management"
    ],
    correct: "It prevents multiple threads from executing Python bytecodes at once",
    explanation: "The GIL ensures only one thread executes Python bytecode at a time, limiting parallelism.",
    level: "advanced",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "What does the following code output?\n\nprint(list(map(lambda x: x*2, [1, 2, 3])))",
    choices: [
      "[2, 4, 6]",
      "[1, 2, 3]",
      "[1, 4, 9]",
      "[2, 3, 4]"
    ],
    correct: "[2, 4, 6]",
    explanation: "map applies the lambda to each element, doubling each value.",
    level: "advanced",
    category: "python",
    type: "multiple-choice"
  },
  {
    question: "Which of the following is the correct way to open a file for writing in Python?",
    choices: [
      "open('file.txt', 'w')",
      "open('file.txt', 'r')",
      "open('file.txt', 'a')",
      "open('file.txt', 'rw')"
    ],
    correct: "open('file.txt', 'w')",
    explanation: "'w' mode opens the file for writing (and truncates it if it exists).",
    level: "advanced",
    category: "python",
    type: "multiple-choice"
  }
];