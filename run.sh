function show_usage {
    echo "usage: run.sh filename [port_number]"
    echo "  filename: the path to the file to be read"
    echo "  port_number: the port number for the HTTP server, default: 3000"
}
if [ $# -eq 0 ]; then
    show_usage
    exit
fi



clear && node app.js $1 $2
