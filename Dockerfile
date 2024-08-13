FROM ubuntu:latest
COPY "./build/chillbot" "./"
CMD "./chillbot"