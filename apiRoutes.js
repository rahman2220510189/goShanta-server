const express = require('express');
const router = express.Router();

function cleanSearchQuery(query) {
    const stopWords = new Set([
        'i', 'wanna', 'to', 'come', 'please', 'want', 'go', 'visit',
        'the', 'a', 'an', 'is', 'are', 'in', 'on', 'of', 'for', 'and', 'with', 'my', 'can', 'will', 'should', 'like', 'wish', 'travel'
    ]);
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => !stopWords.has(word))
        .join(' ');
}

function extractFiltersFromQuery(query) {
    query = query.toLowerCase();

    const budgetKeywords = {
        low: ['low', 'cheap', 'budget', 'affordable', 'economical'],
        medium: ['medium', 'moderate','moderately', 'midrange', 'average'],
        high: ['high', 'expensive', 'luxury', 'premium']
    };

    const hobbyKeywords = {
        nature: ['nature', 'forest', 'eco', 'wildlife', 'lake', 'park'],
        history: ['history', 'historical', 'museum', 'heritage', 'palace'],
        photography: ['photography', 'photo', 'camera', 'pictures'],
        adventure: ['adventure', 'hiking', 'trek', 'climbing'],
        picnic: ['picnic', 'family trip']
    };

    const idealForKeywords = {
        family: ['family', 'kids', 'children', 'parents'],
        solo: ['solo', 'alone', 'single'],
        couple: ['couple', 'partner', 'spouse', 'honeymoon'],
        friends: ['friends', 'group', 'gang']
    };

    let budget = '', hobby = '', idealFor = '';

    for (const [key, words] of Object.entries(budgetKeywords)) {
        if (words.some(word => query.includes(word))) {
            budget = key;
            break;
        }
    }

    for (const [key, words] of Object.entries(hobbyKeywords)) {
        if (words.some(word => query.includes(word))) {
            hobby = key;
            break;
        }
    }

    for (const [key, words] of Object.entries(idealForKeywords)) {
        if (words.some(word => query.includes(word))) {
            idealFor = key;
            break;
        }
    }

    return { budget, hobby, idealFor };
}

module.exports = function (db) {
    router.get('/search', async (req, res) => {
        try {
            let q = req.query.q?.trim() || '';
            const originalQuery = q;
            q = cleanSearchQuery(q);
            if (!q) return res.json({ message: 'Empty or invalid search query' });

            const { budget, hobby, idealFor } = extractFiltersFromQuery(originalQuery);
            const textWords = q.split(' ').filter(Boolean);
            const regexes = textWords.map(w => new RegExp(w, 'i'));

            const orFilter = regexes.flatMap(regex => [
                { name: regex },
                { description: regex },
                { district: regex },
                { division: regex },
                { country: regex },
                { 'user_reviews.comment': regex },
                { tags: regex },
                { type: regex }
            ]);

            const andFilters = [{ $or: orFilter }];

            if (budget) andFilters.push({ budget_level: budget });
            if (hobby) andFilters.push({ tags: { $in: [hobby] } });
            if (idealFor) andFilters.push({ ideal_for: { $in: [idealFor] } });

            const finalQuery = { $and: andFilters };

            const spots = await db.collection('spots').find(finalQuery).toArray();


            const countries = await db.collection('countries').find({}).toArray();
            const matchingDivisions = [];
            countries.forEach(c => {
                (c.divisions || []).forEach(d => {
                    if (regexes.some(r => r.test(d))) {
                        matchingDivisions.push({ division: d, country: c.name });
                    }
                });
            });


            const matchingCountries = await db.collection('countries').find({
                $or: regexes.map(r => ({ name: r }))
            }).toArray();


            const matchingDistricts = await db.collection('districts').find({
                $or: regexes.flatMap(r => [
                    { name: r },
                    { division: r }
                ])
            }).toArray();

            res.json({
                spots,
                divisions: matchingDivisions,
                countries: matchingCountries,
                districts: matchingDistricts
            });

        } catch (err) {
            console.error('Search error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });





    router.get('/countries', async (req, res) => {
        try {
            const countries = await db.collection('countries').find({}).toArray();
            res.json(countries);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching countries' });
        }
    });

    router.get('/countries/:countryName/divisions', async (req, res) => {
        try {
            const country = await db.collection('countries').findOne({ name: req.params.countryName });
            if (country && Array.isArray(country.divisions)) {
                res.json(country.divisions);
            } else {
                res.status(404).json({ error: 'Country or divisions not found' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Error fetching divisions' });
        }
    });

    router.get('/divisions/:divisionName/districts', async (req, res) => {
        try {
            const districts = await db.collection('districts').find({ division: req.params.divisionName }).toArray();
            res.json(districts);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching districts' });
        }
    });

    router.get('/districts/:districtName/spots', async (req, res) => {
        try {
            const spots = await db.collection('spots').find({ district: req.params.districtName }).toArray();
            res.json(spots);
        } catch (err) {
            res.status(500).json({ error: 'Error fetching spots' });
        }
    });
    router.get('/packages', async (req, res) => {
        try {
            const data = await db.collection('packages').find().toArray();
            res.json(data);
        } catch (err) {
            console.error('Error fetching packages ', err);
            res.status(500).json({
                error: 'Server error'
            })
        }
    })
    router.get('/best', async (req, res) => {
        try {
            const data = await db.collection('best').find().toArray();
            res.json(data);
        } catch (err) {
            console.error('Error fetching packages ', err);
            res.status(500).json({
                error: 'Server error'
            })
        }
    });

    const hotelsCollection = db.collection('hotels');
    router.get('/hotels/search', async (req, res) => {
        try {
            const query = req.query.query?.trim(); // get search from query parameters
            if (!query) {
                return res.status(400).json({ message: 'Search query is required' })
            }
            const searchRegex = new RegExp(query, 'i') // 'i ' for case insensitive 
            const hotels = await hotelsCollection.find({
                $or: [
                    { name: searchRegex },
                    { 'location.area': searchRegex },
                    { 'location.district': searchRegex },
                    { 'location.division': searchRegex },
                ]
            }).toArray();
            if (hotels.length === 0) {
                return res.status(404).json({ message: ' No hotels Found' });

            }
            res.status(200).json(hotels);
        }
        catch (err) {
            console.error('Error in search endpoint:', err);
            res.status(500).json({ message: 'Server error' });
        }

    })


    return router;
};
