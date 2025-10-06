# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy everything first
COPY . ./

# Copy appsettings from root to Web_API if needed
COPY appsettings*.json ./Web_API/

# Restore dependencies
RUN dotnet restore hcm-chatbot-api.sln

# Build and publish
RUN dotnet publish Web_API/Web_API.csproj -c Release -o /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
WORKDIR /app
COPY --from=build /app .
# Also copy config files to ensure they're available
COPY --from=build /src/appsettings*.json ./
ENTRYPOINT ["dotnet", "Web_API.dll"]
