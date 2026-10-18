FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B verify
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache su-exec && addgroup -S wedding && adduser -S wedding -G wedding && mkdir -p /data/media
WORKDIR /app
COPY --from=build /app/target/invitation-0.1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["/bin/sh","-c","chown -R wedding:wedding /data/media && exec su-exec wedding java -XX:MaxRAMPercentage=70 -jar app.jar"]