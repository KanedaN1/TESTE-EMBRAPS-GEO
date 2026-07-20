import axios from 'axios';

// WMO Weather interpretation codes
// Heavy Rain: 65, 82
// Thunderstorm: 95, 96, 99
const HEAVY_RAIN_CODES = [65, 82, 95, 96, 99];

export const checkHeavyRain = async () => {
  try {
    // Santos / Baixada Santista coordinates
    const lat = -23.9554;
    const lng = -46.3312;
    
    // Using current weather and daily forecast
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=weathercode&timezone=America%2FSao_Paulo`);
    
    const currentWeatherCode = response.data.current_weather.weathercode;
    
    const isHeavyRainNow = HEAVY_RAIN_CODES.includes(currentWeatherCode);
    
    return {
      isHeavyRainNow,
      currentCode: currentWeatherCode,
      dailyForecast: response.data.daily.weathercode // for tomorrow predictions
    };
  } catch (error) {
    console.error("Error fetching weather data", error);
    return { isHeavyRainNow: false, currentCode: 0, dailyForecast: [] };
  }
};
