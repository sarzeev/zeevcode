FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw mvnw
COPY .mvn .mvn
COPY pom.xml pom.xml

COPY src src
RUN chmod +x mvnw && ./mvnw --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV PORT=8081
EXPOSE 8081

COPY --from=build /app/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
