require('dotenv').config({ quiet: true });
const express = require('express');
const app = express();
const cors = require('cors');
const NodeCache = require('node-cache');
const compression = require('compression');
const port = process.env.PORT || 3000;

const cache = new NodeCache({ stdTTL: 600 });

// middlewares
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173/',
    credentials: true,
  }),
);

// ===============>

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // ===============>
    // database
    const db = client.db('e-commerce-analytics-dashboard');
    // collection
    const usersCollection = await db.collection('users');
    const productsCollection = await db.collection('products');
    const ordersCollection = await db.collection('orders');

    // dashboard analytics endpoint
    app.get('/api/dashboard/analytics', async (req, res) => {
      try {
        const cacheAnalytics = cache.get('dashboardAnalytics');
        if (cacheAnalytics) {
          return res.json({ message: 'Cached data:', cacheAnalytics });
        }
        // handle jobs parallelly
        const [
          activeUsers,
          totalProducts,
          totalRevenueData,
          monthlySalesData,
          inventoryMetrics,
          customerSegmentation,
        ] = await Promise.all([
          usersCollection.countDocuments(),
          productsCollection.countDocuments(),
          // total revenue and total orders
          ordersCollection
            .aggregate([
              {
                $group: {
                  _id: null,
                  totalRevenue: {
                    $sum: '$totalAmount',
                  },
                  totalOrders: {
                    $sum: 1,
                  },
                },
              },
            ])
            .toArray(),
          // monthly sales data
          ordersCollection
            .aggregate([
              {
                $group: {
                  _id: {
                    year: {
                      $year: '$orderDate',
                    },
                    month: {
                      $month: '$orderDate',
                    },
                  },
                  revenue: {
                    $sum: '$totalAmount',
                  },
                  orders: {
                    $sum: 1,
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  year: '$_id.year',
                  month: '$_id.month',
                  revenue: 1,
                  orders: 1,
                },
              },
              {
                $sort: {
                  year: 1,
                  month: 1,
                },
              },
            ])
            .toArray(),
          // inventory metrics
          productsCollection
            .aggregate([
              {
                $group: {
                  _id: null,
                  totalStocks: {
                    $sum: '$stock',
                  },
                  averageStock: {
                    $avg: '$stock',
                  },
                  lowStock: {
                    $sum: {
                      $cond: [
                        {
                          $lte: ['$stock', 10],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  outOfStock: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ['$stock', 0],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ])
            .toArray(),
          // customer segmentation
          ordersCollection
            .aggregate([
              {
                $group: {
                  _id: '$userId',
                  totalSpent: {
                    $sum: '$totalAmount',
                  },
                  orderCount: {
                    $sum: 1,
                  },
                  averageOrderValue: {
                    $avg: '$totalAmount',
                  },
                  lastPurchaseDate: {
                    $max: '$orderDate',
                  },
                },
              },
              {
                $addFields: {
                  daysSinceLastPurchase: {
                    $dateDiff: {
                      startDate: '$lastPurchaseDate',
                      endDate: '$$NOW',
                      // Built-in variable for current time
                      unit: 'day', // Can be "year", "month", "day", "hour", etc.
                    },
                  },
                },
              },
              {
                $addFields: {
                  segment: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $lt: ['daysSinceLastPurchase', 30],
                          },
                          then: 'Regular',
                        },
                        {
                          case: {
                            $lt: ['daysSinceLastPurchase', 7],
                          },
                          then: 'Active',
                        },
                        {
                          case: {
                            $and: [
                              {
                                $lt: ['daysSinceLastPurchase', 7],
                              },
                              {
                                $gt: ['totalSpent', 1000],
                              },
                            ],
                          },
                          then: 'VIP',
                        },
                      ],
                      default: 'At Risk',
                    },
                  },
                },
              },
            ])
            .toArray(),
        ]);

        const { totalRevenue, totalOrders } = totalRevenueData[0];

        const analyticsData = {
          activeUsers,
          totalProducts,
          totalRevenue,
          monthlySalesData,
          inventoryMetrics: inventoryMetrics[0],
          customerAnalytics: {
            totalCustomers: customerSegmentation.length,
            averageLifetimeValue:
              customerSegmentation.reduce(
                (acc, cur) => acc + cur.totalSpent,
                0,
              ) / customerSegmentation.length || 0,
            customerSegmentation,
          },
          kpis: {
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            conversionRate:
              activeUsers > 0 ?
                ((totalOrders / activeUsers) * 100).toFixed(2)
              : 0,
            stockTurnoverRate:
              inventoryMetrics[0]?.totalStocks > 0 ?
                totalRevenue / inventoryMetrics[0].totalStocks
              : 0,
          },
        };
        // set cache data, analyticsData is assigned to cacheAnalytics (ln: 51), remains 10 min in cache
        cache.set('dashboardAnalytics', analyticsData, 600);

        res.json(analyticsData);
      } catch (error) {
        console.log(error);
        res
          .status(500)
          .json({ message: 'Internal server error', error: error.message });
      }
    });

    // ===============>

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// ===============>

app.get('/', (req, res) => {
  res.send('E-commerce Analytics Dashboard');
});

app.listen(port, () => {
  console.log(`Server is running ---> http://localhost:${port}`);
});

// Z8MReSGN9q2v2BGG
