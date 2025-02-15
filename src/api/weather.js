export async function getLocation() {
  const response = await fetch("https://ipapi.co/json/");
  const locationData = await response.json();
  return locationData;
}

export async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=apparent_temperature`;
  const response = await fetch(url);
  const weatherData = await response.json();
  return weatherData;
}