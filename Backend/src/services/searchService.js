const mongoose = require('mongoose');

class SearchService {
    /**
     * Filter operators mapping
     */
    static OPERATORS = {
        equals: '$eq',
        notEquals: '$ne',
        contains: '$regex',
        startsWith: '$regex',
        endsWith: '$regex',
        gt: '$gt',
        gte: '$gte',
        lt: '$lt',
        lte: '$lte',
        in: '$in',
        notIn: '$nin',
        between: 'between',
        exists: '$exists'
    };

    /**
     * Build MongoDB query from filter criteria
     * @param {Array} filters - Array of filter objects
     * @returns {Object} MongoDB query object
     */
    buildSearchQuery(filters = []) {
        const query = {};

        filters.forEach(filter => {
            const { field, operator, value } = filter;

            if (!field || !operator || value === undefined) {
                return;
            }

            const mongoOperator = SearchService.OPERATORS[operator];

            if (!mongoOperator) {
                throw new Error(`Invalid operator: ${operator}`);
            }

            switch (operator) {
                case 'equals':
                    query[field] = { [mongoOperator]: value };
                    break;

                case 'notEquals':
                    query[field] = { [mongoOperator]: value };
                    break;

                case 'contains':
                    query[field] = { [mongoOperator]: value, $options: 'i' };
                    break;

                case 'startsWith':
                    query[field] = { [mongoOperator]: `^${value}`, $options: 'i' };
                    break;

                case 'endsWith':
                    query[field] = { [mongoOperator]: `${value}$`, $options: 'i' };
                    break;

                case 'gt':
                case 'gte':
                case 'lt':
                case 'lte':
                    query[field] = { [mongoOperator]: value };
                    break;

                case 'in':
                case 'notIn':
                    query[field] = { [mongoOperator]: Array.isArray(value) ? value : [value] };
                    break;

                case 'between':
                    if (Array.isArray(value) && value.length === 2) {
                        query[field] = { $gte: value[0], $lte: value[1] };
                    }
                    break;

                case 'exists':
                    query[field] = { [mongoOperator]: Boolean(value) };
                    break;

                default:
                    query[field] = value;
            }
        });

        return query;
    }

    /**
     * Apply text search across multiple fields
     * @param {Object} query - Existing query object
     * @param {String} searchText - Text to search for
     * @param {Array} fields - Fields to search in
     * @returns {Object} Updated query object
     */
    applyTextSearch(query, searchText, fields = []) {
        if (!searchText || !fields.length) {
            return query;
        }

        const searchConditions = fields.map(field => ({
            [field]: { $regex: searchText, $options: 'i' }
        }));

        if (Object.keys(query).length > 0) {
            return {
                $and: [
                    query,
                    { $or: searchConditions }
                ]
            };
        }

        return { $or: searchConditions };
    }

    /**
     * Build sort object from sort criteria
     * @param {Array} sortCriteria - Array of sort objects [{field, order}]
     * @returns {Object} MongoDB sort object
     */
    buildSortObject(sortCriteria = []) {
        const sort = {};

        sortCriteria.forEach((criteria, index) => {
            const { field, order } = criteria;

            if (field) {
                // Use 1 for ascending, -1 for descending
                sort[field] = order === 'desc' || order === -1 ? -1 : 1;
            }
        });

        return sort;
    }

    /**
     * Generic search across any model
     * @param {Model} model - Mongoose model
     * @param {Object} searchCriteria - Search criteria object
     * @returns {Promise<Object>} Search results with pagination
     */
    async searchRecords(model, searchCriteria = {}) {
        const {
            filters = [],
            sort = [],
            page = 1,
            limit = 50,
            searchText = '',
            searchFields = [],
            populate = [],
            select = ''
        } = searchCriteria;

        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 records per page
        const skip = (pageNum - 1) * limitNum;

        // Build query
        let query = this.buildSearchQuery(filters);

        // Apply text search if provided
        if (searchText && searchFields.length > 0) {
            query = this.applyTextSearch(query, searchText, searchFields);
        }

        // Build sort object
        const sortObject = this.buildSortObject(sort);

        // Execute query with pagination
        const [results, total] = await Promise.all([
            model
                .find(query)
                .sort(sortObject)
                .skip(skip)
                .limit(limitNum)
                .populate(populate)
                .select(select)
                .lean(),
            model.countDocuments(query)
        ]);

        return {
            results,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNext: pageNum < Math.ceil(total / limitNum),
                hasPrev: pageNum > 1
            }
        };
    }

    /**
     * Search with aggregation pipeline
     * @param {Model} model - Mongoose model
     * @param {Object} searchCriteria - Search criteria
     * @param {Array} additionalPipeline - Additional aggregation stages
     * @returns {Promise<Object>} Aggregated search results
     */
    async searchWithAggregation(model, searchCriteria = {}, additionalPipeline = []) {
        const {
            filters = [],
            sort = [],
            page = 1,
            limit = 50,
            searchText = '',
            searchFields = []
        } = searchCriteria;

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        // Build match stage
        let matchQuery = this.buildSearchQuery(filters);
        if (searchText && searchFields.length > 0) {
            matchQuery = this.applyTextSearch(matchQuery, searchText, searchFields);
        }

        // Build sort stage
        const sortObject = this.buildSortObject(sort);

        // Build aggregation pipeline
        const pipeline = [
            { $match: matchQuery },
            ...additionalPipeline,
            { $sort: sortObject },
            {
                $facet: {
                    results: [
                        { $skip: skip },
                        { $limit: limitNum }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ];

        const [aggregateResult] = await model.aggregate(pipeline);
        const results = aggregateResult.results || [];
        const total = aggregateResult.totalCount[0]?.count || 0;

        return {
            results,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNext: pageNum < Math.ceil(total / limitNum),
                hasPrev: pageNum > 1
            }
        };
    }

    /**
     * Validate search criteria
     * @param {Object} searchCriteria - Search criteria to validate
     * @returns {Object} Validation result
     */
    validateSearchCriteria(searchCriteria) {
        const errors = [];

        if (searchCriteria.filters && !Array.isArray(searchCriteria.filters)) {
            errors.push('Filters must be an array');
        }

        if (searchCriteria.sort && !Array.isArray(searchCriteria.sort)) {
            errors.push('Sort must be an array');
        }

        if (searchCriteria.page && (isNaN(searchCriteria.page) || searchCriteria.page < 1)) {
            errors.push('Page must be a positive number');
        }

        if (searchCriteria.limit && (isNaN(searchCriteria.limit) || searchCriteria.limit < 1 || searchCriteria.limit > 100)) {
            errors.push('Limit must be between 1 and 100');
        }

        if (searchCriteria.searchFields && !Array.isArray(searchCriteria.searchFields)) {
            errors.push('Search fields must be an array');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get available filter operators
     * @returns {Array} Array of operator objects
     */
    getAvailableOperators() {
        return [
            { value: 'equals', label: 'Equals', types: ['string', 'number', 'boolean', 'date'] },
            { value: 'notEquals', label: 'Not Equals', types: ['string', 'number', 'boolean', 'date'] },
            { value: 'contains', label: 'Contains', types: ['string'] },
            { value: 'startsWith', label: 'Starts With', types: ['string'] },
            { value: 'endsWith', label: 'Ends With', types: ['string'] },
            { value: 'gt', label: 'Greater Than', types: ['number', 'date'] },
            { value: 'gte', label: 'Greater Than or Equal', types: ['number', 'date'] },
            { value: 'lt', label: 'Less Than', types: ['number', 'date'] },
            { value: 'lte', label: 'Less Than or Equal', types: ['number', 'date'] },
            { value: 'in', label: 'In', types: ['string', 'number'] },
            { value: 'notIn', label: 'Not In', types: ['string', 'number'] },
            { value: 'between', label: 'Between', types: ['number', 'date'] },
            { value: 'exists', label: 'Exists', types: ['any'] }
        ];
    }
}

module.exports = new SearchService();
