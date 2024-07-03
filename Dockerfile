FROM alpine:latest
COPY "./build/4kbot" "./"
CMD "4kbot"