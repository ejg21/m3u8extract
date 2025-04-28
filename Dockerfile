# Use the official Node.js image from the Docker Hub
FROM node:16

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json (or yarn.lock if using Yarn) to install dependencies first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files into the container
COPY . .

# Expose the port the app runs on (optional, if your app listens on a port)
EXPOSE 3000

# Run the index.js file with Node.js
CMD ["node", "index.js"]
