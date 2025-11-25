const express = require('express');
const router = express.Router();

// Initialize the GA4 client with service account credentials
let analyticsDataClient = null;
let BetaAnalyticsDataClient = null;

// Lazy load Google Analytics only if credentials are configured
const initializeAnalyticsClient = () => {
  if (analyticsDataClient) return analyticsDataClient;

  try {
    // Only require the package if we have credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GA_SERVICE_ACCOUNT_KEY) {
      console.warn('⚠️ Google Analytics credentials not configured - analytics will return mock data');
      return null;
    }

    const { BetaAnalyticsDataClient: Client } = require('@google-analytics/data');
    BetaAnalyticsDataClient = Client;

    // Check if service account credentials are provided
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      analyticsDataClient = new BetaAnalyticsDataClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } else if (process.env.GA_SERVICE_ACCOUNT_KEY) {
      // Alternative: Use JSON key from environment variable
      const credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_KEY);
      analyticsDataClient = new BetaAnalyticsDataClient({
        credentials,
      });
    }

    console.log('✅ Google Analytics client initialized');
    return analyticsDataClient;
  } catch (error) {
    console.error('❌ Error initializing Google Analytics client:', error.message);
    return null;
  }
};

// GET monthly visitor statistics
router.get('/visitors/monthly', async (req, res) => {
  try {
    const client = initializeAnalyticsClient();

    if (!client) {
      return res.status(200).json({
        message: 'Google Analytics is not configured - showing mock data',
        visitors: {
          currentMonth: 0,
          currentMonthSessions: 0,
          lastMonth: 0,
          allTime: 0,
          monthlyData: []
        }
      });
    }

    const propertyId = process.env.GA4_PROPERTY_ID;

    if (!propertyId) {
      return res.status(500).json({
        message: 'GA4 Property ID not configured',
        visitors: {
          currentMonth: 0,
          lastMonth: 0,
          allTime: 0,
          monthlyData: []
        }
      });
    }

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Format dates for GA4 API (YYYY-MM-DD)
    const firstDayThisMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    // Calculate first day of last month
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastDayLastMonth = new Date(currentYear, currentMonth - 1, 0).getDate();
    const firstDayLastMonth = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    const lastDayLastMonthStr = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${lastDayLastMonth}`;

    // Run GA4 report for current month
    const [currentMonthResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: firstDayThisMonth,
          endDate: today,
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
        {
          name: 'sessions',
        },
      ],
    });

    // Run GA4 report for last month
    const [lastMonthResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: firstDayLastMonth,
          endDate: lastDayLastMonthStr,
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
    });

    // Run GA4 report for all time
    const [allTimeResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '2020-01-01',
          endDate: today,
        },
      ],
      metrics: [
        {
          name: 'totalUsers',
        },
      ],
    });

    // Get monthly breakdown for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    const [monthlyBreakdownResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: sixMonthsAgoStr,
          endDate: today,
        },
      ],
      dimensions: [
        {
          name: 'month',
        },
        {
          name: 'year',
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
      orderBys: [
        {
          dimension: {
            dimensionName: 'year',
          },
        },
        {
          dimension: {
            dimensionName: 'month',
          },
        },
      ],
    });

    // Extract data from responses
    const currentMonthVisitors = currentMonthResponse.rows?.[0]?.metricValues?.[0]?.value || 0;
    const currentMonthSessions = currentMonthResponse.rows?.[0]?.metricValues?.[1]?.value || 0;
    const lastMonthVisitors = lastMonthResponse.rows?.[0]?.metricValues?.[0]?.value || 0;
    const allTimeVisitors = allTimeResponse.rows?.[0]?.metricValues?.[0]?.value || 0;

    // Format monthly breakdown
    const monthlyData = monthlyBreakdownResponse.rows?.map(row => {
      const year = row.dimensionValues[1].value;
      const month = row.dimensionValues[0].value;
      const visitors = row.metricValues[0].value;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(month) - 1;

      return {
        month: monthNames[monthIndex],
        year: year,
        visitors: parseInt(visitors),
      };
    }) || [];

    res.status(200).json({
      visitors: {
        currentMonth: parseInt(currentMonthVisitors),
        currentMonthSessions: parseInt(currentMonthSessions),
        lastMonth: parseInt(lastMonthVisitors),
        allTime: parseInt(allTimeVisitors),
        monthlyData: monthlyData,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching Google Analytics data:', error.message);
    res.status(500).json({
      message: 'Failed to fetch analytics data',
      error: error.message,
      visitors: {
        currentMonth: 0,
        lastMonth: 0,
        allTime: 0,
        monthlyData: []
      }
    });
  }
});

module.exports = router;
