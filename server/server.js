import 'dotenv/config';

import dns from 'node:dns';

// Force Node DNS to use public resolvers.
// Useful for MongoDB SRV connection lookups.
dns.setServers(['8.8.8.8', '1.1.1.1']);

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import Beach from './models/Beach.js';
import Alert from './models/Alert.js';
import Report from './models/Report.js';
import SearchHistory from './models/SearchHistory.js';

import {
  beaches as fallbackBeaches
} from './data.js';

import {
  getWeather,
  weatherLabel
} from './services/weather.js';

import {
  getMarine
} from './services/marine.js';

import {
  computeSafetyStatus,
  createLiveAlerts
} from './services/safety.js';

import {
  getNearbyFacilities
} from './services/facilities.js';


/* =========================================================
   APP CONFIGURATION
========================================================= */

const app = express();

const PORT = Number(
  process.env.PORT || 5001
);

const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ||
  'http://localhost:5173,https://beachsafe-portal.vercel.app';

const MONGODB_URI =
  process.env.MONGODB_URI?.trim() || '';


const beachImageCatalog = {
  'Agatti Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Agatti_island%2C_Lakshadweep.jpg', credit: 'icultist · CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Agatti_island,_Lakshadweep.jpg' },
  'Baga Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Baga_Beach%2C_Goa.jpg', credit: 'Slyronit · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Baga_Beach,_Goa.jpg' },
  'Besant Nagar Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Besant_Nagar_Beach_Chennai_india.jpg', credit: 'N. Vivekananthamoorthy · CC BY 4.0', source: 'https://commons.wikimedia.org/wiki/File:Besant_Nagar_Beach_Chennai_india.jpg' },
  'Dhanushkodi Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Dhanushkodi_03.jpg', credit: 'Athulvis · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Dhanushkodi_03.jpg' },
  'Digha Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Old_Digha_Beach_at_Sunrise_1.jpg', credit: 'Ne0Freedom · CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Old_Digha_Beach_at_Sunrise_1.jpg' },
  "Elliot's Beach": { image: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Elliots_Beach_at_Besant_Nagar%2C_Chennai.JPG', credit: 'KARTY JazZ · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Elliots_Beach_at_Besant_Nagar,_Chennai.JPG' },
  'Juhu Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Juhu_beach_2019.jpg', credit: 'Shishirdasika · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Juhu_beach_2019.jpg' },
  'Kanyakumari Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Kanyakumari_beach_2020.jpg', credit: 'Casual clicks · CC0', source: 'https://commons.wikimedia.org/wiki/File:Kanyakumari_beach_2020.jpg' },
  'Kovalam Beach|Thiruvananthapuram': { image: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Kovalam_Beach_%2C_Kerala.jpg', credit: 'Harvinder Chandigarh · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kovalam_Beach_,_Kerala.jpg' },
  'Kovalam Beach|Chengalpattu': { image: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Kovalam_Beach%2C_Chennai_-_Mid_Sea_Diving.jpg', credit: 'KARTY JazZ · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Kovalam_Beach,_Chennai_-_Mid_Sea_Diving.jpg' },
  'Mahabalipuram Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Ideal_Beach_Coconuts_Mahabalipuram_Sep22_R16_06301.jpg', credit: 'Timothy A. Gonsalves · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Ideal_Beach_Coconuts_Mahabalipuram_Sep22_R16_06301.jpg' },
  'Manapad Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Manapad-Manavai-seashore-catholic-church-Thoothukudi-district-TamilNadu.JPG', credit: 'தகவலுழவன் · CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:Manapad-Manavai-seashore-catholic-church-Thoothukudi-district-TamilNadu.JPG' },
  'Marina Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Marina_and_the_sailors.jpg', credit: 'Abu Abdullah 23 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Marina_and_the_sailors.jpg' },
  'Nagapattinam Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Fisherman_preparing_their_nets_at_Nagapattinam_Beach.jpg', credit: 'Matthew T Rader · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Fisherman_preparing_their_nets_at_Nagapattinam_Beach.jpg' },
  'Om Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/5/53/PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna%2C_Karnataka_35.jpg', credit: 'Sourabh.biswas003 · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:PXL_20260103_101009613_People_and_Beach_Om_Beach_Gokarna,_Karnataka_35.jpg' },
  'Pichavaram Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/f/fb/Pichavaram_Mangrove_Forest.jpg', credit: 'Satdeep Gill · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Pichavaram_Mangrove_Forest.jpg' },
  'Poompuhar Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Poompuhar_Beach_with_lighthouse_and_visitors1.jpg', credit: 'E. Saravanan · CC0', source: 'https://commons.wikimedia.org/wiki/File:Poompuhar_Beach_with_lighthouse_and_visitors1.jpg' },
  'Puri Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/4/45/At_Puri_beach_05.jpg', credit: 'Kritzolina · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:At_Puri_beach_05.jpg' },
  'RK Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/8/84/RK_Beach_Visakhapatnam_Nov_2012_-_02.JPG', credit: 'Rishabh Tatiraju · CC BY-SA 3.0', source: 'https://commons.wikimedia.org/wiki/File:RK_Beach_Visakhapatnam_Nov_2012_-_02.JPG' },
  'Radhanagar Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Radhanagar_Beach_in_the_Andaman_Islands.jpg', credit: 'La Vacanza Travel Private Limited · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Radhanagar_Beach_in_the_Andaman_Islands.jpg' },
  'Rameswaram Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Rameswaram_coral_beach.jpg', credit: 'Shajinss · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Rameswaram_coral_beach.jpg' },
  'Shivrajpur Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Shivrajpur_beach_Devbhoomi_Dwarka_district.jpg', credit: 'VasuVR · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Shivrajpur_beach_Devbhoomi_Dwarka_district.jpg' },
  'Silver Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Silver_beach_at_Cuddalore.jpg', credit: 'Sharmila Rangaraj · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Silver_beach_at_Cuddalore.jpg' },
  'Tharangambadi Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Bungalow_on_the_Beach%2C_Neemrana_Hotels%2C_in_Tranquebar%2C_Tamil_Nadu.jpg', credit: 'Koshy Koshy · CC BY 2.0', source: 'https://commons.wikimedia.org/wiki/File:Bungalow_on_the_Beach,_Neemrana_Hotels,_in_Tranquebar,_Tamil_Nadu.jpg' },
  'Tuticorin Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Fishing_in_Tuticorin_beach.jpg', credit: 'Ramkumar · CC BY-SA 2.0', source: 'https://commons.wikimedia.org/wiki/File:Fishing_in_Tuticorin_beach.jpg' },
  'Varkala Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Varkala_Beach%2C_Varkala%2C_Kerala.jpg', credit: 'Devender Goyal · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Varkala_Beach,_Varkala,_Kerala.jpg' },
  'Velankanni Beach': { image: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Women_at_work_in_Uttan_-_Velankanni_Beach.jpg', credit: 'Balurbala · CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Women_at_work_in_Uttan_-_Velankanni_Beach.jpg' }
};

const fallbackBeachImage = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=80';

function withBeachImage(beach) {
  if (!beach) {
    return beach;
  }

  const catalogEntry = beachImageCatalog[`${beach.name}|${beach.district}`] || beachImageCatalog[beach.name];

  return {
    ...beach,
    image: catalogEntry?.image || beach.image || fallbackBeachImage,
    imageCredit: catalogEntry?.credit || null,
    imageSource: catalogEntry?.source || null
  };
}


/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  ...new Set([
    ...CLIENT_ORIGIN
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),

    'https://beachsafe-portal.vercel.app'
  ])
];


function isAllowedOrigin(origin) {
  // Requests such as direct browser navigation
  // may not contain an Origin header.
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);

    return (
      ['localhost', '127.0.0.1'].includes(
        url.hostname
      ) &&
      url.protocol === 'http:'
    ) || (
      url.protocol === 'http:' &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname)
    );
  } catch {
    return false;
  }
}


app.use(
  cors({
    origin: (origin, callback) => {
      callback(
        null,
        isAllowedOrigin(origin)
      );
    },

    credentials: false
  })
);


app.use(
  express.json({
    limit: '2mb'
  })
);


/* =========================================================
   MONGODB CONNECTION
========================================================= */

let mongoReady = false;

let mongoPromise = null;

let mongoError = null;


/**
 * Connect to MongoDB Atlas.
 *
 * This function:
 * - reuses an existing connection
 * - avoids creating multiple simultaneous connections
 * - stores a safe diagnostic error
 * - retries after a failed connection
 */
async function connectMongo() {

  /* ---------------------------------------------
     No URI configured
  --------------------------------------------- */

  if (!MONGODB_URI) {
    mongoReady = false;

    mongoError = {
      name: 'ConfigurationError',
      message:
        'MONGODB_URI is not configured.'
    };

    return false;
  }


  /* ---------------------------------------------
     Already connected
  --------------------------------------------- */

  if (
    mongoose.connection.readyState === 1
  ) {
    mongoReady = true;
    mongoError = null;

    return true;
  }


  /* ---------------------------------------------
     Connection already in progress
  --------------------------------------------- */

  if (mongoPromise) {
    return mongoPromise;
  }


  console.log(
    'Attempting MongoDB connection...'
  );


  /* ---------------------------------------------
     Start connection
  --------------------------------------------- */

  mongoPromise = mongoose
    .connect(MONGODB_URI, {

      // Give Vercel enough time to establish
      // the Atlas connection.
      serverSelectionTimeoutMS: 15000,

      connectTimeoutMS: 15000,

      socketTimeoutMS: 45000,

      maxPoolSize: 10,

      minPoolSize: 0,

      // Use IPv4 to avoid certain network issues.
      family: 4
    })

    .then(() => {

      mongoReady = true;

      mongoError = null;

      console.log(
        'MongoDB connected successfully'
      );

      return true;
    })

    .catch((err) => {

      mongoReady = false;

      mongoPromise = null;

      mongoError = {
        name:
          err?.name ||
          'MongoError',

        message:
          err?.message ||
          'Unknown MongoDB connection error'
      };


      console.error(
        'MONGODB_CONNECTION_ERROR:',
        err?.message || err
      );


      return false;
    });


  return mongoPromise;
}


/* =========================================================
   MONGODB EVENTS
========================================================= */

mongoose.connection.on(
  'connected',
  () => {

    mongoReady = true;

    mongoError = null;

    console.log(
      'MongoDB event: connected'
    );
  }
);


mongoose.connection.on(
  'disconnected',
  () => {

    mongoReady = false;

    console.warn(
      'MongoDB event: disconnected'
    );
  }
);


mongoose.connection.on(
  'error',
  (err) => {

    mongoReady = false;

    mongoError = {
      name:
        err?.name ||
        'MongoError',

      message:
        err?.message ||
        'MongoDB connection event error'
    };


    console.error(
      'MongoDB connection event error:',
      err?.message || err
    );
  }
);


/* =========================================================
   FALLBACK BEACH HELPERS
========================================================= */

function toPlainFallbackBeach(
  raw,
  index = 0
) {

  return withBeachImage({
    ...raw,

    state:
      raw.state ||
      'Tamil Nadu',

    _id:
      raw._id ||
      `fallback-${index}`,

    id:
      raw._id ||
      `fallback-${index}`
  });
}


/* =========================================================
   FIND BEACH
========================================================= */

async function findBeach(id) {

  const idText = String(id);

  if (idText.startsWith('fallback-')) {
    const idx = Number(idText.replace('fallback-', ''));
    const fallbackBeach = fallbackBeaches[idx];

    if (!fallbackBeach) {
      return null;
    }

    if (mongoReady) {
      const beach = await Beach
        .findOne({ name: fallbackBeach.name })
        .lean();

      return withBeachImage(beach);
    }

    return toPlainFallbackBeach(fallbackBeach, idx);
  }

  if (mongoReady) {

    const beach = await Beach
      .findById(id)
      .lean();

    return withBeachImage(beach);
  }


  return null;
}


/* =========================================================
   BEACH ALERTS
========================================================= */

async function persistSearchHistory(query, beach) {
  if (!mongoReady) {
    throw new Error('MongoDB is not connected.');
  }

  const cleanedQuery = String(query).trim();

  if (!cleanedQuery || !beach?._id) {
    throw new Error('A valid search query and database beach are required.');
  }

  const beachId = beach?._id ? String(beach._id) : null;

  return SearchHistory.findOneAndUpdate(
    {
      query: cleanedQuery,
      beachId
    },
    {
      query: cleanedQuery,
      beachId,
      beachName: beach.name,
      district: beach.district || '',
      state: beach.state || 'Tamil Nadu',
      coordinates: beach.coordinates || null,
      image: beach.image || null,
      searchedAt: new Date()
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}


async function getBeachAlerts(
  beachId,
  fallbackIndex = null
) {

  /* ---------------------------------------------
     MongoDB mode
  --------------------------------------------- */

  if (mongoReady) {

    return Alert
      .find({
        beachId,
        active: true,
        source: { $not: /demo/i }
      })
      .sort({
        issuedAt: -1
      })
      .lean();
  }


  /* ---------------------------------------------
     Fallback demo mode
  --------------------------------------------- */

  return [];
}


/* =========================================================
   ROOT
========================================================= */

app.get(
  '/',
  async (req, res) => {

    res.json({

      service:
        'BeachSafe API',

      version:
        '1.0.0',

      status:
        'running',

      endpoints: {

        health:
          '/api/health',

        beaches:
          '/api/beaches',

        beachDetails:
          '/api/beaches/:id',

        fullBeachData:
          '/api/beaches/:id/full',

        facilities:
          '/api/beaches/:id/facilities',

        reports:
          '/api/reports'
      },

      frontend:
        CLIENT_ORIGIN,

      message:
        'BeachSafe API is running.'
    });
  }
);


/* =========================================================
   API ROOT
========================================================= */

app.get(
  '/api',
  (req, res) => {

    res.json({

      success:
        true,

      service:
        'BeachSafe API',

      message:
        'API is running. Use /api/health to check service status.'
    });
  }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/search-history',
  async (req, res) => {
    try {
      await connectMongo();

      const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 50);
      const history = await SearchHistory
        .find({})
        .sort({ searchedAt: -1 })
        .limit(limit)
        .lean();

      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      console.error('Search history error:', err);
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch search history'
      });
    }
  }
);

app.post(
  '/api/search-history',
  async (req, res) => {
    const query = typeof req.body?.query === 'string'
      ? req.body.query.trim()
      : '';
    const beachId = typeof req.body?.beachId === 'string'
      ? req.body.beachId.trim()
      : '';

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty search query is required.'
      });
    }

    try {
      const connected = await connectMongo();
      if (!connected) {
        return res.status(503).json({
          success: false,
          message: 'Search history is unavailable because MongoDB is not connected.'
        });
      }

      if (!mongoose.isValidObjectId(beachId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid database beach ID is required.'
        });
      }

      const beach = await Beach.findById(beachId).lean();
      if (!beach) {
        return res.status(404).json({
          success: false,
          message: 'The selected beach was not found.'
        });
      }

      const normalizedQuery = query.toLocaleLowerCase();
      const searchableValues = [
        beach.name,
        beach.district,
        beach.state,
        ...(Array.isArray(beach.tags) ? beach.tags : [])
      ];
      const matchesQuery = searchableValues.some(
        (value) => typeof value === 'string'
          && value.toLocaleLowerCase().includes(normalizedQuery)
      );

      if (!matchesQuery) {
        return res.status(400).json({
          success: false,
          message: 'The selected beach does not match the search query.'
        });
      }

      const saved = await persistSearchHistory(query, withBeachImage(beach));
      return res.status(200).json({
        success: true,
        data: saved
      });
    } catch (err) {
      console.error('Search history persistence failed:', err?.message || err);
      return res.status(500).json({
        success: false,
        message: 'Failed to save search history.'
      });
    }
  }
);


app.get(
  '/api/health',
  async (req, res) => {

    // Important:
    // Explicitly attempt MongoDB connection
    // before reporting the health state.
    await connectMongo();


    res.json({

      success:
        true,

      service:
        'BeachSafe API',

      mongoReady,

      database:
        mongoReady
          ? 'MongoDB'
          : 'fallback demo data',

      mongoConfigured:
        Boolean(MONGODB_URI),

      // Diagnostic information.
      // This never contains your password.
      mongoError
    });
  }
);


/* =========================================================
   GET ALL / SEARCH BEACHES
========================================================= */

app.get(
  '/api/beaches',
  async (req, res) => {

    try {

      await connectMongo();


      const q = String(
        req.query.q || ''
      ).trim();


      const regex = q
        ? new RegExp(q, 'i')
        : null;


      const limit =
        Math.min(
          Math.max(
            Number(
              req.query.limit || 30
            ),
            1
          ),
          100
        );


      let list;


      /* ---------------------------------------------
         MONGODB MODE
      --------------------------------------------- */

      if (mongoReady) {

        const filter = q
          ? {
              $or: [

                {
                  name: regex
                },

                {
                  district: regex
                },

                {
                  state: regex
                },

                {
                  tags: regex
                }
              ]
            }
          : {};


        list =
          await Beach
            .find(filter)
            .sort({
              name: 1
            })
            .limit(limit)
            .lean();

        list = list.map((beach) => withBeachImage(beach));
      }


      /* ---------------------------------------------
         FALLBACK MODE
      --------------------------------------------- */

      else {

        list =
          fallbackBeaches

            .filter((b) => {

              if (!regex) {
                return true;
              }


              return (

                regex.test(b.name) ||

                regex.test(
                  b.district
                ) ||

                regex.test(
                  b.state
                ) ||

                b.tags?.some(
                  (tag) =>
                    regex.test(tag)
                )
              );
            })


            .slice(0, limit)


            .map((b) =>
              toPlainFallbackBeach(
                b,
                fallbackBeaches.indexOf(
                  b
                )
              )
            );


        list =
          await Promise.all(
            list.map(
              async (beach) => {

                const fallbackIndex =
                  Number(
                    String(
                      beach._id
                    ).replace(
                      'fallback-',
                      ''
                    )
                  );


                const alerts =
                  await getBeachAlerts(
                    beach._id,
                    fallbackIndex
                  );


                const alertLevel =
                  alerts.some(
                    (alert) =>
                      [
                        'high',
                        'emergency'
                      ].includes(
                        alert.severity
                      )
                  )
                    ? 'high'
                    : alerts.some(
                        (alert) =>
                          alert.severity ===
                          'caution'
                      )
                    ? 'yellow'
                    : beach
                        .safety
                        ?.alertLevel ||
                      'green';


                return {

                  ...withBeachImage(beach),

                  safety: {

                    ...beach.safety,

                    alertLevel
                  }
                };
              }
            )
          );
      }


      res.json({

        success:
          true,

        data:
          list,

        source:
          mongoReady
            ? 'MongoDB'
            : 'fallback'
      });

    } catch (err) {

      console.error(
        'Beach search error:',
        err
      );


      res.status(500).json({

        success:
          false,

        message:
          err?.message ||
          'Failed to fetch beaches'
      });
    }
  }
);


/* =========================================================
   GET SINGLE BEACH
========================================================= */

app.get(
  '/api/beaches/:id',
  async (req, res) => {

    try {

      await connectMongo();


      const beach =
        await findBeach(
          req.params.id
        );


      const enrichedBeach = withBeachImage(beach);

      if (!beach) {

        return res.status(404).json({

          success:
            false,

          message:
            'Beach not found'
        });
      }


      const fallbackIndex =
        String(
          beach._id
        ).startsWith(
          'fallback-'
        )
          ? Number(
              String(
                beach._id
              ).replace(
                'fallback-',
                ''
              )
            )
          : null;


      const alerts =
        await getBeachAlerts(
          beach._id,
          fallbackIndex
        );


      res.json({

        success:
          true,

        data: {

          beach: enrichedBeach,

          alerts
        }
      });

    } catch (err) {

      console.error(
        'Beach details error:',
        err
      );


      res.status(500).json({

        success:
          false,

        message:
          err.message
      });
    }
  }
);


/* =========================================================
   FULL BEACH DATA
   WEATHER + MARINE + SAFETY + ALERTS + FACILITIES
========================================================= */

app.get(
  '/api/beaches/:id/full',
  async (req, res) => {

    try {

      await connectMongo();


      const beach =
        await findBeach(
          req.params.id
        );

      const enrichedBeach = withBeachImage(beach);


      if (!beach) {

        return res.status(404).json({

          success:
            false,

          message:
            'Beach not found'
        });
      }


      const fallbackIndex =
        String(
          beach._id
        ).startsWith(
          'fallback-'
        )
          ? Number(
              String(
                beach._id
              ).replace(
                'fallback-',
                ''
              )
            )
          : null;


      /* ---------------------------------------------
         Weather + Marine + Alerts
      --------------------------------------------- */

      const [
        weatherResult,
        marineResult,
        alertsResult
      ] =
        await Promise.allSettled([

          getWeather(
            beach.coordinates.lat,
            beach.coordinates.lng
          ),

          getMarine(
            beach.coordinates.lat,
            beach.coordinates.lng
          ),

          getBeachAlerts(
            beach._id,
            fallbackIndex
          )
        ]);


      /* ---------------------------------------------
         Weather
      --------------------------------------------- */

      const weather =
        weatherResult.status ===
        'fulfilled'
          ? weatherResult.value
          : null;


      /* ---------------------------------------------
         Marine
      --------------------------------------------- */

      const marine =
        marineResult.status ===
        'fulfilled'
          ? marineResult.value
          : null;


      /* ---------------------------------------------
         Alerts
      --------------------------------------------- */

      const liveAlerts =
        createLiveAlerts({
          weather,
          marine,
          beachId: beach._id
        });

      const alertData =
        alertsResult.status ===
        'fulfilled'
          ? [...alertsResult.value, ...liveAlerts]
          : liveAlerts;


      /* ---------------------------------------------
         Safety calculation
      --------------------------------------------- */

      const safetyStatus =
        computeSafetyStatus({

          beach,

          marine,

          alerts:
            alertData
        });


      /* ---------------------------------------------
         Facilities
      --------------------------------------------- */

      const facilitiesResult = await Promise.allSettled([
        getNearbyFacilities(beach)
      ]);

      const facilities = facilitiesResult[0].status === 'fulfilled'
        ? facilitiesResult[0].value
        : [];


      /* ---------------------------------------------
         Final response
      --------------------------------------------- */

      res.json({

        success:
          true,

        data: {

          beach: enrichedBeach,


          weather:
            weather
              ? {

                  ...weather,

                  description:
                    weatherLabel(
                      weather.weatherCode
                    )
                }
              : {

                  error:
                    'Live weather temporarily unavailable.'
                },


          marine:
            marine || {

              error:
                'Live marine data temporarily unavailable.'
            },


          safetyStatus,


          alerts:
            alertData,


          facilities,


          lastUpdated:
            new Date().toISOString(),


          dataSource:
            mongoReady
              ? 'MongoDB + live services'
              : 'Fallback beach data + live services'
        }
      });

    } catch (err) {

      console.error(
        'Full beach data error:',
        err
      );


      res.status(500).json({

        success:
          false,

        message:
          err?.message ||
          'Failed to load beach information'
      });
    }
  }
);


/* =========================================================
   FACILITIES
========================================================= */

app.get(
  '/api/beaches/:id/facilities',
  async (req, res) => {

    try {

      await connectMongo();


      const beach =
        await findBeach(
          req.params.id
        );


      if (!beach) {

        return res.status(404).json({

          success:
            false,

          message:
            'Beach not found'
        });
      }


      const facilitiesResult = await Promise.allSettled([
        getNearbyFacilities(beach)
      ]);

      const facilities = facilitiesResult[0].status === 'fulfilled'
        ? facilitiesResult[0].value
        : [];


      res.json({

        success:
          true,

        data:
          facilities
      });

    } catch (err) {

      console.error(
        'Facilities error:',
        err
      );


      res.status(500).json({

        success:
          false,

        message:
          err.message
      });
    }
  }
);


/* =========================================================
   REPORT A HAZARD
========================================================= */

app.post(
  '/api/reports',
  async (req, res) => {

    try {

      await connectMongo();


      const {
        beachId,
        category,
        description,
        reporter,
        coordinates
      } = req.body;


      if (
        !beachId ||
        !category ||
        !description
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            'beachId, category and description are required.'
        });
      }


      /* ---------------------------------------------
         MongoDB mode
      --------------------------------------------- */

      if (mongoReady) {

        const report =
          await Report.create({

            beachId,

            category,

            description,

            reporter,

            coordinates
          });


        return res.status(201).json({

          success:
            true,

          data:
            report
        });
      }


      /* ---------------------------------------------
         Fallback mode
      --------------------------------------------- */

      return res.status(201).json({

        success:
          true,

        data: {

          _id:
            `local-${Date.now()}`,

          beachId,

          category,

          description,

          reporter:
            reporter ||
            'Anonymous visitor',

          coordinates,

          status:
            'new',

          createdAt:
            new Date().toISOString()
        },

        demoMode:
          true
      });

    } catch (err) {

      console.error(
        'Report error:',
        err
      );


      res.status(500).json({

        success:
          false,

        message:
          err.message
      });
    }
  }
);


/* =========================================================
   SERVER START
========================================================= */

app.listen(
  PORT,
  async () => {

    console.log(
      `BeachSafe API running at http://localhost:${PORT}`
    );


    if (MONGODB_URI) {

      await connectMongo();

    } else {

      console.warn(
        'MONGODB_URI is not configured.'
      );
    }
  }
);


/* =========================================================
   EXPORT APP
========================================================= */

export default app;