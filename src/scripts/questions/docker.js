export const dockerQuestions = [
  {
    question: "What does Docker use to define the steps to build a container image?",
    choices: [
      "docker-compose.yml",
      "Dockerfile",
      "Containerfile",
      "Makefile"
    ],
    correct: "Dockerfile",
    explanation: "A Dockerfile contains instructions to build a Docker image.",
    level: "beginner",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which command is used to list all Docker containers (including stopped ones)?",
    choices: [
      "docker ps",
      "docker ps -a",
      "docker list",
      "docker containers --all"
    ],
    correct: "docker ps -a",
    explanation: "`docker ps -a` lists all containers, running or stopped.",
    level: "beginner",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which Docker command is used to create a new image from a container’s changes?",
    choices: [
      "docker build",
      "docker save",
      "docker commit",
      "docker export"
    ],
    correct: "docker commit",
    explanation: "`docker commit` saves the changes in a container as a new image.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What is the default network driver for Docker containers?",
    choices: [
      "host",
      "bridge",
      "overlay",
      "none"
    ],
    correct: "bridge",
    explanation: "The default Docker network is the `bridge` network for isolated container networking.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "How do you run a container in the background?",
    choices: [
      "docker run -s",
      "docker run --silent",
      "docker run -d",
      "docker run &"
    ],
    correct: "docker run -d",
    explanation: "`-d` (detached mode) runs the container in the background.",
    level: "beginner",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which file defines multi-container Docker applications?",
    choices: [
      "Dockerfile",
      "docker-compose.yml",
      "docker.yaml",
      "Dockerrun"
    ],
    correct: "docker-compose.yml",
    explanation: "`docker-compose.yml` defines services, volumes, and networks for multi-container apps.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which command builds images defined in a Dockerfile?",
    choices: [
      "docker create",
      "docker build",
      "docker compile",
      "docker init"
    ],
    correct: "docker build",
    explanation: "`docker build` reads a Dockerfile and builds an image.",
    level: "beginner",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What does `docker volume` manage?",
    choices: [
      "Container logs",
      "Image layers",
      "Persistent data storage",
      "Network configuration"
    ],
    correct: "Persistent data storage",
    explanation: "Docker volumes are used to persist data across container restarts.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "How do you remove all stopped containers?",
    choices: [
      "docker clean",
      "docker rm -a",
      "docker container prune",
      "docker system reset"
    ],
    correct: "docker container prune",
    explanation: "`docker container prune` deletes all stopped containers.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What command shows logs from a running Docker container?",
    choices: [
      "docker status <container>",
      "docker logs <container>",
      "docker info <container>",
      "docker view <container>"
    ],
    correct: "docker logs <container>",
    explanation: "`docker logs` retrieves the log output of a container.",
    level: "beginner",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What is the purpose of the `ENTRYPOINT` instruction in a Dockerfile?",
    choices: [
      "Defines environment variables",
      "Specifies the image tag",
      "Specifies the default command to run",
      "Sets the container port"
    ],
    correct: "Specifies the default command to run",
    explanation: "`ENTRYPOINT` defines the default executable for the container.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "How do you share data between a container and the host machine?",
    choices: [
      "Using a bridge network",
      "Using a mounted volume",
      "Using an environment variable",
      "Using docker cp"
    ],
    correct: "Using a mounted volume",
    explanation: "Volumes allow file system sharing between host and container.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What command removes a Docker image from the system?",
    choices: [
      "docker image remove <image>",
      "docker rmi <image>",
      "docker delete <image>",
      "docker untag <image>"
    ],
    correct: "docker rmi <image>",
    explanation: "`docker rmi` deletes a Docker image from local storage.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which of the following best describes an image layer?",
    choices: [
      "A temporary copy of the container",
      "A compressed snapshot of container logs",
      "A reusable file system state used to build images",
      "A sandboxed kernel process"
    ],
    correct: "A reusable file system state used to build images",
    explanation: "Docker images are built in layers that cache and reuse file system changes.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "How do you update a running container’s environment variable?",
    choices: [
      "docker env set",
      "docker exec --set-env",
      "You must recreate the container",
      "docker container update --env"
    ],
    correct: "You must recreate the container",
    explanation: "Environment variables are set at container start and require recreation to change.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What does `docker inspect` return?",
    choices: [
      "Network statistics",
      "Container logs",
      "Detailed JSON config data",
      "Running processes"
    ],
    correct: "Detailed JSON config data",
    explanation: "`docker inspect` returns low-level JSON metadata about Docker objects.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which command saves a Docker image to a tar archive?",
    choices: [
      "docker save",
      "docker export",
      "docker archive",
      "docker bundle"
    ],
    correct: "docker save",
    explanation: "`docker save` creates a tar archive of an image for sharing or backup.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile?",
    choices: [
      "CMD runs first, ENTRYPOINT runs last",
      "ENTRYPOINT overrides CMD",
      "CMD provides default args, ENTRYPOINT defines the command",
      "They are aliases"
    ],
    correct: "CMD provides default args, ENTRYPOINT defines the command",
    explanation: "`ENTRYPOINT` defines the command, `CMD` provides default arguments.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "Which Docker command displays resource usage statistics for containers?",
    choices: [
      "docker monitor",
      "docker stats",
      "docker top",
      "docker system info"
    ],
    correct: "docker stats",
    explanation: "`docker stats` shows CPU, memory, and I/O usage per container.",
    level: "intermediate",
    category: "docker",
    type: "multiple-choice"
  },
  {
    question: "How do you connect a container to an existing Docker network?",
    choices: [
      "docker connect <network> <container>",
      "docker network attach",
      "docker network connect <network> <container>",
      "docker join network <container>"
    ],
    correct: "docker network connect <network> <container>",
    explanation: "Use `docker network connect` to attach containers to user-defined networks.",
    level: "advanced",
    category: "docker",
    type: "multiple-choice"
  }
]