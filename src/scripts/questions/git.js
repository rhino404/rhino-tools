export const gitQuestions = [
  {
    question: "Which command initializes a new Git repository in your current directory?",
    choices: [
      "git init",
      "git start",
      "git create",
      "git new"
    ],
    correct: "git init",
    explanation: "The `git init` command creates a new Git repository.",
    level: "beginner",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which command stages all changes (including new and deleted files) for the next commit?",
    choices: [
      "git commit",
      "git push",
      "git add .",
      "git stage all"
    ],
    correct: "git add .",
    explanation: "`git add .` stages all modified, deleted, and new files in the current directory.",
    level: "beginner",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you check the current status of your Git repository?",
    choices: [
      "git check",
      "git status",
      "git info",
      "git log"
    ],
    correct: "git status",
    explanation: "`git status` displays changes staged for commit and untracked files.",
    level: "beginner",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which command creates a new branch called 'feature-x'?",
    choices: [
      "git create branch feature-x",
      "git checkout -b feature-x",
      "git branch feature-x",
      "git new feature-x"
    ],
    correct: "git branch feature-x",
    explanation: "`git branch feature-x` creates a new branch without switching to it.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What command switches you to a different branch in Git?",
    choices: [
      "git switch branch",
      "git branch switch",
      "git checkout",
      "git change-branch"
    ],
    correct: "git checkout",
    explanation: "`git checkout` is used to switch branches or restore files.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which command shows a history of commits for the current branch?",
    choices: [
      "git commits",
      "git history",
      "git show log",
      "git log"
    ],
    correct: "git log",
    explanation: "`git log` displays the commit history of the current branch.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you discard all local changes to tracked files in Git?",
    choices: [
      "git reset",
      "git undo",
      "git checkout .",
      "git discard all"
    ],
    correct: "git checkout .",
    explanation: "`git checkout .` discards all local changes to tracked files in the working directory.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which command merges the branch 'dev' into the current branch?",
    choices: [
      "git combine dev",
      "git merge dev",
      "git pull dev",
      "git apply dev"
    ],
    correct: "git merge dev",
    explanation: "`git merge dev` merges changes from 'dev' into the current branch.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What command permanently deletes the last local commit but keeps the changes?",
    choices: [
      "git reset --soft HEAD~1",
      "git revert HEAD",
      "git reset --hard HEAD~1",
      "git rm HEAD~1"
    ],
    correct: "git reset --soft HEAD~1",
    explanation: "`git reset --soft HEAD~1` removes the last commit but retains staged changes.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you clone a remote repository using Git?",
    choices: [
      "git remote add [url]",
      "git clone [url]",
      "git fork [url]",
      "git pull [url]"
    ],
    correct: "git clone [url]",
    explanation: "`git clone [url]` downloads a copy of a remote Git repository to your local machine.",
    level: "beginner",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which Git command allows you to edit, reorder, squash, or remove commits in history?",
    choices: [
      "git amend",
      "git rebase -i",
      "git reset --hard",
      "git cherry-pick"
    ],
    correct: "git rebase -i",
    explanation: "`git rebase -i` opens an interactive editor to rewrite commit history.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of the `git stash` command?",
    choices: [
      "To delete changes",
      "To save uncommitted changes temporarily",
      "To commit staged files",
      "To undo the last commit"
    ],
    correct: "To save uncommitted changes temporarily",
    explanation: "`git stash` stores your working directory changes for later use.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you view the changes introduced by a specific commit?",
    choices: [
      "git diff",
      "git log --patch",
      "git show <commit>",
      "git compare <commit>"
    ],
    correct: "git show <commit>",
    explanation: "`git show <commit>` displays the diff and metadata of a specific commit.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which command allows you to apply a specific commit from one branch to another?",
    choices: [
      "git merge",
      "git cherry-pick",
      "git rebase",
      "git apply"
    ],
    correct: "git cherry-pick",
    explanation: "`git cherry-pick` applies the changes from an existing commit onto the current branch.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What is the effect of `git reset --hard HEAD~1`?",
    choices: [
      "Undoes the last commit and keeps the changes",
      "Deletes the last commit and all changes",
      "Resets the index but not the working directory",
      "Unstages all files"
    ],
    correct: "Deletes the last commit and all changes",
    explanation: "`git reset --hard HEAD~1` permanently removes the last commit and working changes.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you find which commits introduced a specific line in a file?",
    choices: [
      "git blame <file>",
      "git history <file>",
      "git log -L",
      "git track <file>"
    ],
    correct: "git blame <file>",
    explanation: "`git blame` shows the commit and author responsible for each line in a file.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of `git reflog`?",
    choices: [
      "To show file history",
      "To view remote logs",
      "To view all changes to HEAD and branch tips",
      "To log remote fetches"
    ],
    correct: "To view all changes to HEAD and branch tips",
    explanation: "`git reflog` tracks updates to HEAD, allowing you to recover lost commits.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "Which Git command lets you continue a merge after resolving conflicts?",
    choices: [
      "git resolve",
      "git continue",
      "git merge --continue",
      "git commit"
    ],
    correct: "git merge --continue",
    explanation: "After resolving conflicts, use `git merge --continue` to complete the merge process.",
    level: "intermediate",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "What does `git clean -fd` do?",
    choices: [
      "Deletes tracked files",
      "Stashes staged files",
      "Removes untracked files and directories",
      "Resets HEAD to origin"
    ],
    correct: "Removes untracked files and directories",
    explanation: "`git clean -fd` forcefully deletes untracked files (`-f`) and directories (`-d`).",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  },
  {
    question: "How do you permanently remove a file from Git history?",
    choices: [
      "git rm <file>",
      "git reset <file>",
      "git filter-branch",
      "git stash drop"
    ],
    correct: "git filter-branch",
    explanation: "`git filter-branch` rewrites history and can remove a file from all previous commits.",
    level: "advanced",
    category: "git",
    type: "multiple-choice"
  }
]
