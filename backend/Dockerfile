FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src src
RUN mvn -B verify
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S wedding && adduser -S wedding -G wedding
WORKDIR /app
COPY --from=build /app/target/invitation-0.1.0.jar app.jar
USER wedding
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70","-jar","app.jar"]