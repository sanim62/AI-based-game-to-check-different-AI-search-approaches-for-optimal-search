# Lightweight production static web server
FROM nginx:alpine

# Copy project files to Nginx web root
COPY . /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
