# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file if exists
COPY *.sln ./

# Copy project files
COPY Web_API/Web_API.csproj ./Web_API/
COPY Services/*.csproj ./Services/
COPY Repositories/*.csproj ./Repositories/
COPY Models/*.csproj ./Models/
COPY Data/*.csproj ./Data/

# Restore dependencies
RUN dotnet restore Web_API/Web_API.csproj

# Copy source code
COPY . ./

# Build and publish
RUN dotnet publish Web_API/Web_API.csproj -c Release -o /app --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "Web_API.dll"]
