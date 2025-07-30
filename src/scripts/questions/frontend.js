export const frontendQuestions = [
  {
    question: "Which HTML tag is used to define the main content of a document?",
    choices: [
      "<main>",
      "<body>",
      "<section>",
      "<content>"
    ],
    correct: "<main>",
    explanation: "The <main> tag specifies the primary content of the document.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "Which CSS property is used to create space between the element’s border and its content?",
    choices: [
      "margin",
      "padding",
      "border-spacing",
      "spacing"
    ],
    correct: "padding",
    explanation: "Padding controls the space between the content and the element’s border.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of the 'z-index' property in CSS?",
    choices: [
      "To zoom in on elements",
      "To set element opacity",
      "To control stacking order",
      "To index elements for animation"
    ],
    correct: "To control stacking order",
    explanation: "The `z-index` determines the vertical stacking of overlapping elements.",
    level: "intermediate",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "Which JavaScript method is used to add an element to the end of an array?",
    choices: [
      "push()",
      "append()",
      "add()",
      "insert()"
    ],
    correct: "push()",
    explanation: "`push()` appends an element to the end of an array in JavaScript.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "Which HTML element is used to link an external JavaScript file?",
    choices: [
      "<script href='app.js'>",
      "<js src='app.js'>",
      "<script src='app.js'>",
      "<link rel='js' href='app.js'>"
    ],
    correct: "<script src='app.js'>",
    explanation: "The `script` tag with the `src` attribute links to external JS files.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "What does 'flex-grow: 1' do in a flexbox layout?",
    choices: [
      "Shrinks the item",
      "Fixes its size",
      "Allows the item to grow and fill available space",
      "Aligns the item to center"
    ],
    correct: "Allows the item to grow and fill available space",
    explanation: "`flex-grow: 1` makes the flex item expand to fill unused space proportionally.",
    level: "intermediate",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "Which event is fired when a user clicks an HTML element?",
    choices: [
      "onmouseover",
      "onchange",
      "onclick",
      "onpress"
    ],
    correct: "onclick",
    explanation: "`onclick` triggers when an element is clicked.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "In React, what hook is used to handle component state?",
    choices: [
      "useRef()",
      "useEffect()",
      "useState()",
      "useContext()"
    ],
    correct: "useState()",
    explanation: "`useState()` is the React Hook for local component state.",
    level: "intermediate",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "Which HTTP status code means 'Not Found'?",
    choices: [
      "200",
      "301",
      "404",
      "500"
    ],
    correct: "404",
    explanation: "`404 Not Found` is returned when the requested resource does not exist.",
    level: "beginner",
    category: "frontend",
    type: "multiple-choice"
  },
  {
    question: "What is the default value of the CSS 'position' property?",
    choices: [
      "relative",
      "absolute",
      "static",
      "fixed"
    ],
    correct: "static",
    explanation: "The default `position` of all HTML elements is `static`.",
    level: "intermediate",
    category: "frontend",
    type: "multiple-choice"
  }
]
