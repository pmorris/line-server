# node.js is required
if ! type "node" > /dev/null; then
    echo "Please install node and try again."
    exit;
fi

#install the necessary modules
echo "Installing required modules..."
npm install

echo "The application has been built successfully."
