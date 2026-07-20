import { useState, useEffect, useMemo } from 'react';
import { getPosts, getDailySpreadsheet } from '../services/apiMock';
import { checkHeavyRain } from '../services/weatherApi';
import { getTrafficIncidents } from '../services/trafficApi';

export const useGeoDashboard = () => {
  const [posts, setPosts] = useState([]);
  const [spreadsheet, setSpreadsheet] = useState([]);
  const [weather, setWeather] = useState({ isHeavyRainNow: false, currentCode: 0, dailyForecast: [] });
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    name: '',
    supervisor: '',
    neighborhood: '',
    status: '' // 'Operacional', 'Alerta', 'Chuva'
  });

  const [currentMonth, setCurrentMonth] = useState('Janeiro');

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [fetchedPosts, fetchedSpreadsheet, fetchedWeather, fetchedTraffic] = await Promise.all([
        getPosts(),
        getDailySpreadsheet(currentMonth),
        checkHeavyRain(),
        getTrafficIncidents()
      ]);

      setPosts(fetchedPosts);
      setSpreadsheet(fetchedSpreadsheet);
      setWeather(fetchedWeather);
      setTraffic(fetchedTraffic);
      setLoading(false);
    };

    loadData();
  }, [currentMonth]);

  // Process rules for Posts
  const processedPosts = useMemo(() => {
    if (!posts.length || !spreadsheet.length) return [];

    // Sort to find top 10s
    const sortedByAbsences = [...spreadsheet].sort((a, b) => b.absences - a.absences);
    const sortedByDismissals = [...spreadsheet].sort((a, b) => b.dismissals - a.dismissals);

    const top10AbsencesIds = sortedByAbsences.filter(s => s.absences > 0).slice(0, 10).map(s => s.postId);
    const top10DismissalsIds = sortedByDismissals.filter(s => s.dismissals > 0).slice(0, 10).map(s => s.postId);

    return posts.map(post => {
      const postMetrics = spreadsheet.find(s => s.postId === post.id) || { absences: 0, dismissals: 0, postSales: 0 };
      
      let status = 'Operacional'; // Verde
      let color = 'green';

      const isTop10Absence = top10AbsencesIds.includes(post.id);
      const isTop10Dismissal = top10DismissalsIds.includes(post.id);
      const hasBadPostSales = postMetrics.postSales > 0;

      if (isTop10Absence || isTop10Dismissal || hasBadPostSales) {
        status = 'Alerta'; // Vermelho
        color = 'red';
      } else if (weather.isHeavyRainNow && post.comporta) {
        status = 'Chuva'; // Azul
        color = 'blue';
      }

      return {
        ...post,
        metrics: postMetrics,
        status,
        color
      };
    });
  }, [posts, spreadsheet, weather]);

  // Apply filters
  const filteredPosts = useMemo(() => {
    return processedPosts.filter(post => {
      if (filters.name && !post.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.supervisor && !(post.supDay.toLowerCase().includes(filters.supervisor.toLowerCase()) || post.supNight.toLowerCase().includes(filters.supervisor.toLowerCase()))) return false;
      if (filters.neighborhood && !post.neighborhood.toLowerCase().includes(filters.neighborhood.toLowerCase())) return false;
      if (filters.status && post.status !== filters.status) return false;
      return true;
    });
  }, [processedPosts, filters]);

  // Calculate KPIs based on ALL processed posts (or filtered? Usually KPIs are global unless filtered, let's make it global for the month)
  const kpis = useMemo(() => {
    let totalAbsences = 0;
    let totalDismissals = 0;
    let totalPostSales = 0;

    spreadsheet.forEach(row => {
      totalAbsences += row.absences;
      totalDismissals += row.dismissals;
      totalPostSales += row.postSales;
    });

    return {
      totalPosts: posts.length,
      totalAbsences,
      totalDismissals,
      totalPostSales
    };
  }, [posts, spreadsheet]);

  const addPost = (newPost) => {
    setPosts(prev => [...prev, newPost]);
  };

  return {
    posts: filteredPosts,
    allPosts: processedPosts, // for context or specific maps
    kpis,
    weather,
    traffic,
    loading,
    filters,
    setFilters,
    currentMonth,
    setCurrentMonth,
    addPost
  };
};
