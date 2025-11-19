# Base image (Can be a lightweight OS, or just a runtime environment)
FROM node:lts-alpine
# Move to a certain folder in the container
# Similar to $ cd
WORKDIR /app
# Install the application dependencies
# Copies files from your local machine to the image
COPY . .
# Install the dependencies inside the image
RUN npm install
# Configure the port the container will expose
# EXPOSE 3000
# Default command that is executed whenever the container boots
CMD ["npm", "run", "dev"]

