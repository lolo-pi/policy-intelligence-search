/**
 * Kendra Search API utilities
 * 
 * IMPORTANT: Document type filtering uses the 'aq_type' field from Kendra document attributes
 * as the primary source of document type information. This field is used in UI filters and facet counts.
 * As a fallback, the '_category' field is also checked to maintain compatibility with older documents.
 */

const API_ENDPOINT = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/search';
const FACET_COUNTS_ENDPOINT = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/facet-counts';
const INDEX_ID = 'ac2e614a-1a60-4788-921f-439355c5756d';

/**
 * Search Kendra with optional jurisdiction filter and document type filter
 * @param {string|string[]} [jurisdiction] - Optional jurisdiction(s) to filter by (string or array of strings)
 * @param {string} [documentType] - Optional document type (_category) to filter by
 * @param {boolean} [fetchFacets] - Whether to fetch facet counts instead of search results
 * @param {boolean} [suppressErrors] - Whether to suppress error messages (default: false)
 * @returns {Promise<Object>} - Search results or facet counts
 */
export const searchKendra = async (query = '', jurisdiction = null, documentType = null, fetchFacets = false, suppressErrors = false) => {
  try {
    // Trim inputs but preserve the leading space in " Source Report"
    const trimmedQuery = query?.trim() || '';
    
    // Build the base request using proper Kendra API structure
    const requestBody = {
      // Return to previous wildcard format since that works with the Lambda
      QueryText: trimmedQuery ? `*${trimmedQuery}*` : '*',
      IndexId: INDEX_ID,
      PageSize: 100
    };

    // Process jurisdiction filters in new AttributeFilter format
    const jurisdictionFilters = [];
    
    // Handle different types of jurisdiction input (null, string, or array)
    if (jurisdiction) {
      // Convert single string to array for consistent processing
      const jurisdictionsArray = Array.isArray(jurisdiction) ? jurisdiction : [jurisdiction];
      
      // Check if Minnesota is in the jurisdictions array
      console.log('Minnesota in jurisdictions array?', jurisdictionsArray.includes('Minnesota'));
      
      // Build jurisdiction filters
      jurisdictionsArray.forEach(jur => {
        if (jur && typeof jur === 'string') {
          // Ensure jurisdiction doesn't have underscores (should be spaces)
          let processedJurisdiction = jur;
          
          // Convert underscores to spaces if needed
          if (jur.includes('_')) {
            processedJurisdiction = jur.replace(/_/g, ' ').trim();
          } else {
            processedJurisdiction = jur.trim();
          }
          
          if (jur === 'Minnesota' || processedJurisdiction === 'Minnesota') {
            console.log('Processing Minnesota for Kendra filter:', { 
              original: jur, 
              processed: processedJurisdiction 
            });
          }
          
          if (processedJurisdiction) {
            // Create a Kendra EqualsTo filter for this jurisdiction
            const filter = {
              EqualsTo: {
                Key: "jurisdiction",
                Value: {
                  StringValue: processedJurisdiction
                }
              }
            };
            
            jurisdictionFilters.push(filter);
          }
        }
      });
      
      console.log(`Created ${jurisdictionFilters.length} jurisdiction filters:`, JSON.stringify(jurisdictionFilters, null, 2));
    }
    
    // Special handling for document type - don't trim " Source Report"
    let processedDocType = null;
    if (documentType === " Source Report") {
      // Keep the leading space for Source Report
      processedDocType = " Source Report";
      console.log("Preserving leading space in Source Report filter");
      // Debug log to verify space is preserved
      console.log("Source Report character codes:", Array.from(processedDocType).map(c => c.charCodeAt(0)));
    } else {
      // For other document types, trim as usual
      processedDocType = documentType?.trim() || null;
    }
    
    // Log document type details for debugging
    if (documentType) {
      console.log("Document type details:");
      console.log(` - Original: "${documentType}"`);
      console.log(` - Length: ${documentType.length}`);
      console.log(` - Has leading space: ${documentType.startsWith(' ')}`);
      console.log(` - Character codes: ${Array.from(documentType).map(c => c.charCodeAt(0)).join(', ')}`);
      console.log(` - Processed: "${processedDocType}"`);
    }
    
    // Create document type filter if specified
    let documentTypeFilter = null;
    if (processedDocType) {
      // Create filter for aq_type (primary)
      const aqTypeFilter = {
        EqualsTo: {
          Key: "aq_type",
          Value: {
            StringValue: processedDocType
          }
        }
      };
      
      // Create filter for _category (fallback)
      const categoryFilter = {
        EqualsTo: {
          Key: "_category",
          Value: {
            StringValue: processedDocType
          }
        }
      };
      
      // Use OR condition to match either aq_type or _category
      documentTypeFilter = {
        OrAllFilters: [aqTypeFilter, categoryFilter]
      };
      
      console.log(`Created document type filter:`, JSON.stringify(documentTypeFilter, null, 2));
      
      // Extra check for " Source Report" to ensure space is preserved after JSON serialization
      if (processedDocType === " Source Report") {
        const serialized = JSON.stringify(documentTypeFilter);
        console.log("Serialized Source Report filter:", serialized);
        console.log("Space preserved in serialization:", serialized.includes('" Source Report"'));
      }
    }
    
    // Build the combined AttributeFilter
    let combinedAttributeFilter = null;
    
    // Add jurisdiction filters if any
    if (jurisdictionFilters.length > 0) {
      if (jurisdictionFilters.length === 1) {
        combinedAttributeFilter = jurisdictionFilters[0];
      } else {
        combinedAttributeFilter = {
          OrAllFilters: jurisdictionFilters
        };
      }
    }
    
    // Add document type filter if specified
    if (documentTypeFilter) {
      if (!combinedAttributeFilter) {
        combinedAttributeFilter = documentTypeFilter;
      } else {
        // If we already have jurisdiction filters, combine with AND logic
        combinedAttributeFilter = {
          AndAllFilters: [
            combinedAttributeFilter,
            documentTypeFilter
          ]
        };
      }
    }
    
    // Apply the combined filter to the request
    if (combinedAttributeFilter) {
      requestBody.AttributeFilter = combinedAttributeFilter;
      console.log(`Applied combined attribute filter:`, JSON.stringify(combinedAttributeFilter, null, 2));
      
      // Add a fallback for Source Report for backward compatibility with Lambda
      if (processedDocType === " Source Report") {
        console.log("Adding fallback _category field for Source Report compatibility");
        requestBody._category = " Source Report";
      }
    } else if (processedDocType) {
      // If we only have a document type filter but no combined filter
      // (e.g., no jurisdiction filters were created), add it directly
      requestBody.AttributeFilter = documentTypeFilter;
      
      // Add a fallback for Source Report for backward compatibility with Lambda
      if (processedDocType === " Source Report") {
        console.log("Adding fallback _category field for Source Report compatibility");
        requestBody._category = " Source Report";
      }
    }
    
    // Handle facet retrieval with proper Facets structure
    if (fetchFacets) {
      console.log("Requesting facets data");
      
      // Get comprehensive jurisdiction counts from dedicated endpoint
      let jurisdictionCounts = {};
      
      // Only fetch jurisdiction counts when there's a meaningful search query
      // Not during initial load or with empty query
      if (trimmedQuery && trimmedQuery !== '*') {
        try {
          // Use the original raw query exactly as entered by the user - NO WILDCARDS
          // This is critical for the dedicated jurisdiction counts endpoint
          console.log("Fetching jurisdiction counts for raw search query:", query);
          
          // Pass the jurisdiction filter to the facet counts endpoint if available
          let jurisdictionAttributeFilter = null;
          if (jurisdictionFilters.length > 0) {
            jurisdictionAttributeFilter = jurisdictionFilters.length === 1 
              ? jurisdictionFilters[0] 
              : { OrAllFilters: jurisdictionFilters };
          }
          
          jurisdictionCounts = await fetchFacetCounts(query, jurisdictionAttributeFilter);
          console.log(`Received ${Object.keys(jurisdictionCounts).length} jurisdiction counts from dedicated endpoint`);
        } catch (facetError) {
          console.error("Error fetching jurisdiction counts:", facetError);
          jurisdictionCounts = {};
        }
      } else {
        console.log("Skipping jurisdiction counts for empty/default query");
      }
      
      // Still get document type counts from the main Kendra endpoint
      requestBody.facetSummary = true;
      
      // Add Facets to include both _category and aq_type
      requestBody.Facets = [
        { DocumentAttributeKey: 'jurisdiction' },
        { DocumentAttributeKey: 'aq_type' },
        { DocumentAttributeKey: '_category' }
      ];
      
      // Ensure Source Report handling is consistent for facet requests
      if (processedDocType === " Source Report") {
        console.log("Adding fallback _category field for Source Report in facet request");
        requestBody._category = " Source Report";
      }
      
      // Log complete request for monitoring
      console.log('Making Kendra request for document type counts:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        if (suppressErrors) {
          console.log('Suppressing API error and returning empty results');
          return { 
            facets: {
              documentTypes: {},
              jurisdictions: jurisdictionCounts // Use the already fetched jurisdiction counts
            }
          };
        }
        throw new Error(`Error from Kendra API: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Log the raw response for debugging
      console.log('Raw Kendra response for document types:', JSON.stringify(data, null, 2).substring(0, 1000) + '...');
      
      // Process document type counts from Kendra response
      const docTypeCounts = {};
      
      if (Array.isArray(data)) {
        console.log("Processing document type data from array format");
        data.forEach(facet => {
          // Process document type counts from aq_type attribute (prioritize this)
          if (facet.DocumentAttributeKey === 'aq_type' && 
              Array.isArray(facet.DocumentAttributeValueCountPairs)) {
            facet.DocumentAttributeValueCountPairs.forEach(pair => {
              if (pair.DocumentAttributeValue && pair.DocumentAttributeValue.StringValue) {
                docTypeCounts[pair.DocumentAttributeValue.StringValue] = pair.Count;
              }
            });
            console.log("Document type counts from aq_type:", docTypeCounts);
          }
          
          // Process document type counts from _category as fallback
          if (facet.DocumentAttributeKey === '_category' && 
              Array.isArray(facet.DocumentAttributeValueCountPairs)) {
            facet.DocumentAttributeValueCountPairs.forEach(pair => {
              if (pair.DocumentAttributeValue && pair.DocumentAttributeValue.StringValue) {
                // Only add if not already set by aq_type
                if (!docTypeCounts[pair.DocumentAttributeValue.StringValue]) {
                  docTypeCounts[pair.DocumentAttributeValue.StringValue] = pair.Count;
                }
              }
            });
            console.log("Document type counts after adding _category:", docTypeCounts);
          }
        });
      } else {
        console.warn("Facet data for document types isn't in expected array format:", data);
      }
      
      // Return combined facet data from both sources
      console.log("Returning combined facet data with counts:", {
        documentTypes: Object.keys(docTypeCounts).length,
        jurisdictions: Object.keys(jurisdictionCounts).length
      });
      
      return { 
        facets: {
          documentTypes: docTypeCounts,
          jurisdictions: jurisdictionCounts
        }
      };
    } else {
      // For regular search results (not facets), we use the Lambda-friendly format
      
      // Log complete request for monitoring
      console.log('Kendra request payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        // If suppressErrors is true, don't throw and just return empty results
        if (suppressErrors) {
          console.log('Suppressing API error and returning empty results');
          return {
            results: [],
            totalAvailable: 0
          };
        }
        throw new Error(`Error from Kendra API: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Log the raw response for debugging
      console.log('Raw Kendra response:', JSON.stringify(data, null, 2).substring(0, 1000) + '...');
      
      // For search results, ensure we have an array of results
      let resultsArray;
      if (Array.isArray(data)) {
        resultsArray = data;
      } else if (data.ResultItems && Array.isArray(data.ResultItems)) {
        resultsArray = data.ResultItems;
      } else if (data.results && Array.isArray(data.results)) {
        resultsArray = data.results;
      } else {
        console.error('Unexpected response format:', data);
        resultsArray = [];
      }
      
      const totalAvailable = data.TotalNumberOfResults || data.TotalResultCount || resultsArray.length || 0;
      
      const jurisdictionSummary = jurisdictionFilters.length > 0 
        ? `for ${jurisdictionFilters.length} jurisdiction filters` 
        : 'for all jurisdictions';
      
      console.log(`Received ${resultsArray.length} results ${jurisdictionSummary}${processedDocType ? ' with document type "' + processedDocType + '"' : ''}, Total available: ${totalAvailable}`);
      
      return {
        results: resultsArray,
        totalAvailable: totalAvailable
      };
    }
  } catch (error) {
    console.error('Error searching Kendra:', error.message);
    // If suppressErrors is true, return empty results instead of throwing
    if (suppressErrors) {
      console.log('Suppressing error and returning empty results');
      if (fetchFacets) {
        return { 
          facets: {
            documentTypes: {},
            jurisdictions: {}
          }
        };
      } else {
        return {
          results: [],
          totalAvailable: 0
        };
      }
    }
    throw error;
  }
};

/**
 * Normalize a document type string to match our expected categories
 * @param {string} type - The raw document type 
 * @returns {string} - A normalized document type that matches our filter categories
 */
export function normalizeDocumentType(type) {
  if (!type || type === 'Unknown') return 'Unknown';
  
  // Make sure to trim the input
  const typeStr = String(type).toLowerCase();
  const trimmedType = typeStr.trim();
  
  // Exact matches to Kendra document types
  if (trimmedType === 'regulation') return 'Regulation';
  if (trimmedType === 'source report') return ' Source Report'; // Return with leading space for Kendra
  if (typeStr === ' source report') return ' Source Report'; // Match with leading space preserved
  if (trimmedType === 'compliance document') return 'Compliance Document';
  if (trimmedType === 'guidance-policy') return 'Guidance-Policy';
  if (trimmedType === 'form-template') return 'Form-Template';
  if (trimmedType === 'state implementation plan') return 'State Implementation Plan';
  if (trimmedType === 'protocol') return 'Protocol';
  if (trimmedType === 'general info item') return 'General Info Item';
  if (trimmedType === 'legislation') return 'Legislation';
  
  // Partial matches for better categorization
  if (trimmedType.includes('regul') || trimmedType.includes('rule')) return 'Regulation';
  if (trimmedType.includes('source') && trimmedType.includes('report')) return ' Source Report'; // Return with leading space
  if (trimmedType.includes('compliance')) return 'Compliance Document';
  if (trimmedType.includes('guid') || trimmedType.includes('policy')) return 'Guidance-Policy';
  if (trimmedType.includes('form') || trimmedType.includes('template') || trimmedType.includes('application')) return 'Form-Template';
  if (trimmedType.includes('plan') && trimmedType.includes('implementation')) return 'State Implementation Plan';
  if (trimmedType.includes('protocol')) return 'Protocol';
  if (trimmedType.includes('info') || trimmedType.includes('general')) return 'General Info Item';
  if (trimmedType.includes('law') || trimmedType.includes('legislation')) return 'Legislation';
  
  // Default to Unknown if no match
  return 'Unknown';
}

// Add a debug function to log document type details
function logDocTypeDetails(docType) {
  if (!docType) return;
  console.log('Document type details:');
  console.log(`- Original: "${docType}"`);
  console.log(`- Trimmed: "${docType.trim()}"`);
  console.log(`- Length: ${docType.length}`);
  console.log(`- Char codes:`, Array.from(docType).map(c => c.charCodeAt(0)));
  console.log(`- Normalized: "${normalizeDocumentType(docType)}"`);
}

/**
 * Transform Kendra results into a standardized format for the frontend
 * @param {Array} kendraResponse - The raw Kendra response or results array
 * @returns {Array} - Standardized document objects
 */
export const transformKendraResults = (kendraResponse) => {
  if (!kendraResponse || !Array.isArray(kendraResponse)) {
    console.warn('Invalid Kendra response format:', kendraResponse);
    return [];
  }
  
  const resultItems = kendraResponse;
  
  // Log detailed information about the first result
  if (resultItems.length > 0) {
    console.log('Sample Kendra result structure:', JSON.stringify(resultItems[0]).substring(0, 1000) + '...');
    console.log('Document Attributes:', resultItems[0].DocumentAttributes);
  }
  
  // Track used IDs to ensure uniqueness
  const usedIds = new Set();
  
  // Create transformed results
  const transformedResults = resultItems.map((item, index) => {
    // For debugging, log every 5th item to avoid console flood
    const shouldLog = index % 5 === 0 || index === 0;
    if (shouldLog) {
      console.log(`\nProcessing document ${index}: ${item.DocumentTitle || 'Untitled'}`);
    }
    
    // Extract document type if available - check all possible locations
    let documentType = null;
    let typeSource = 'unknown';
    
    // Check for DocumentAttributes array - prioritize aq_type as that's what Kendra provides
    if (Array.isArray(item.DocumentAttributes)) {
      // First look specifically for aq_type
      const aqTypeAttr = item.DocumentAttributes.find(attr => attr.Key === 'aq_type');
      if (aqTypeAttr && aqTypeAttr.Value && aqTypeAttr.Value.StringValue) {
        documentType = aqTypeAttr.Value.StringValue;
        typeSource = 'aq_type attribute';
        if (shouldLog) {
          console.log(`Found aq_type document attribute: "${aqTypeAttr.Value.StringValue}"`);
        }
      } else {
        // Fallback to _category if aq_type is not found
        const categoryAttr = item.DocumentAttributes.find(attr => attr.Key === '_category');
        if (categoryAttr && categoryAttr.Value && categoryAttr.Value.StringValue) {
          documentType = categoryAttr.Value.StringValue;
          typeSource = '_category attribute';
        }
      }
      
      if (shouldLog) {
        console.log(`Document Attributes:`, item.DocumentAttributes.map(attr => `${attr.Key}: ${JSON.stringify(attr.Value)}`));
      }
    }
    
    // If we didn't find a document type, check alternative fields
    if (!documentType) {
      if (item.Type) { 
        documentType = item.Type;
        typeSource = 'Type field';
      } else if (item.DocumentType) {
        documentType = item.DocumentType;
        typeSource = 'DocumentType field';
      } else if (item._source && item._source._category) {
        documentType = item._source._category;
        typeSource = '_source._category field';
      } else if (item._source && item._source.aq_type) {
        documentType = item._source.aq_type;
        typeSource = '_source.aq_type field';
      }
    }
    
    // If we still don't have a type, try to infer from title
    if (!documentType) {
      const title = item.DocumentTitle || item.Title || '';
      if (title.includes('Regulation') || title.includes('Rule')) {
        documentType = 'Regulation';
        typeSource = 'Inferred from title';
      } else if (title.includes('Report')) {
        documentType = ' Source Report';
        typeSource = 'Inferred from title';
      } else if (title.includes('Guidance') || title.includes('Policy')) {
        documentType = 'Guidance-Policy';
        typeSource = 'Inferred from title';
      } else if (title.includes('Form') || title.includes('Template')) {
        documentType = 'Form-Template';
        typeSource = 'Inferred from title';
      } else if (title.includes('Plan')) {
        documentType = 'State Implementation Plan';
        typeSource = 'Inferred from title';
      } else if (title.includes('Protocol')) {
        documentType = 'Protocol';
        typeSource = 'Inferred from title';
      } else if (title.includes('Law') || title.includes('Legislation')) {
        documentType = 'Legislation';
        typeSource = 'Inferred from title';
      } else if (title.includes('Compliance')) {
        documentType = 'Compliance Document';
        typeSource = 'Inferred from title';
      }
    }
    
    // If no type was found, set to unknown
    if (!documentType) {
      documentType = 'Unknown';
      typeSource = 'Default value';
    }
    
    if (shouldLog) {
      console.log(`Extracted document type: "${documentType}" (Source: ${typeSource})`);
    }
    
    // Extract the URL
    let documentUrl = '';

    // First check for _source_uri in DocumentAttributes as this seems to be the most reliable
    if (Array.isArray(item.DocumentAttributes)) {
      const sourceUriAttr = item.DocumentAttributes.find(attr => attr.Key === '_source_uri');
      if (sourceUriAttr && sourceUriAttr.Value && sourceUriAttr.Value.StringValue) {
        documentUrl = sourceUriAttr.Value.StringValue;
        if (shouldLog) {
          console.log(`URL found in _source_uri attribute: ${documentUrl}`);
        }
      }
    }

    // Fall back to other fields if we didn't find a URL in DocumentAttributes
    if (!documentUrl) {
      if (item.DocumentURI) {
        documentUrl = item.DocumentURI;
        if (shouldLog) console.log(`Using DocumentURI: ${documentUrl}`);
      } else if (item.SourceURI) {
        documentUrl = item.SourceURI;
        if (shouldLog) console.log(`Using SourceURI: ${documentUrl}`);
      } else if (item.DocumentId && item.DocumentId.startsWith('http')) {
        documentUrl = item.DocumentId;
        if (shouldLog) console.log(`Using DocumentId as URL: ${documentUrl}`);
      } else if (item.S3Path) {
        documentUrl = item.S3Path;
        if (shouldLog) console.log(`Using S3Path: ${documentUrl}`);
      } else if (item.Url) {
        documentUrl = item.Url;
        if (shouldLog) console.log(`Using Url field: ${documentUrl}`);
      }
    }
    
    // Check if we found a URL
    if (!documentUrl && shouldLog) {
      console.log('No URL found in document. Available fields:', Object.keys(item));
      console.log('Document ID:', item.DocumentId);
    }

    // If we have a SourceUri directly in the item (comes from Lambda)
    if (!documentUrl && item.SourceUri) {
      documentUrl = item.SourceUri;
      if (shouldLog) console.log(`Using root SourceUri: ${documentUrl}`);
    }

    // Debug the URL
    if (shouldLog) {
      console.log(`Final URL for document: ${documentUrl || 'None found'}`);
    }
    
    // Extract document excerpt/description
    let description = '';
    if (item.DocumentExcerpt && item.DocumentExcerpt.Text) {
      description = item.DocumentExcerpt.Text;
    } else if (item.Excerpt) {
      description = typeof item.Excerpt === 'string' ? item.Excerpt : item.Excerpt.Text || '';
    } else if (item.ExcerptText) {
      description = item.ExcerptText;
    } else if (item.Description) {
      description = item.Description;
    } else if (item.Summary) {
      description = item.Summary;
    }
    
    // If still no description, try to extract it from _source._excerpt or similar fields
    if (!description && item._source && item._source._excerpt) {
      description = item._source._excerpt;
    }
    
    // Extract jurisdiction
    const jurisdiction = getJurisdictionFromResponse(item);

    // Special debug for South Coast AQMD
    if (jurisdiction === 'South_Coast_AQMD' || isLikelySouthCoastAQMD(item)) {
      console.log(`Document appears to be from South Coast AQMD: "${item.DocumentTitle}"`);
    }

    // Log jurisdiction extraction for debugging
    if (shouldLog) {
      console.log(`Extracted jurisdiction: "${jurisdiction}" from:`, {
        title: item.DocumentTitle || '',
        documentId: item.DocumentId || ''
      });
    }
    
    // Generate a unique ID for the document
    let docId = item.Id || item.DocumentId || '';
    
    // If ID is already used or missing, create a unique identifier
    if (!docId || usedIds.has(docId)) {
      // Create a unique ID using hash of title + URL if available, or a random string
      const titlePart = item.DocumentTitle || item.Title || '';
      const urlPart = documentUrl || '';
      
      if (titlePart && urlPart) {
        // Create a hash from title and URL
        docId = `doc-${titlePart.substring(0, 20)}-${urlPart.substring(urlPart.lastIndexOf('/') + 1, urlPart.length).substring(0, 10)}-${index}`;
      } else {
        // Fallback to random ID with index
        docId = `doc-${Math.random().toString(36).substring(2, 15)}-${index}`;
      }
      
      if (shouldLog && (item.Id || item.DocumentId)) {
        console.log(`Generated new unique ID "${docId}" because original ID was duplicate or invalid`);
      }
    }
    
    // Add the ID to used IDs set
    usedIds.add(docId);
    
    // Extract the data source for determining which duplicate to keep
    const dataSource = item.DocumentId ? 
      (item.DocumentId.includes('sbx-kendra-index') ? 'kendra-index' : 
       item.DocumentId.includes('sbx-colorado-only') ? 'colorado-only' : 'other') : 'unknown';
    
    // Extract regulation number from title if available (for Colorado regulations)
    const title = item.DocumentTitle || item.Title || '';
    let regNumber = null;
    let normalizedTitle = title;
    
    // For Colorado regulations, try to extract the regulation number
    if (jurisdiction === 'Colorado' && title.includes('Regulation') && title.includes('Number')) {
      const match = title.match(/Regulation\s+Number\s+(\d+)/i);
      if (match && match[1]) {
        regNumber = parseInt(match[1], 10);
        // Create a normalized title for deduplication
        normalizedTitle = `Colorado Regulation ${regNumber}`;
      }
    }
    
    // Create and return the standardized document object with deduplication info
    return {
      id: docId,
      title: item.DocumentTitle || item.Title || 'Untitled Document',
      url: documentUrl || item.SourceUri || '',  // Ensure SourceUri is used for URL
      description: description,
      type: documentType,
      jurisdiction: jurisdiction, // Use extracted jurisdiction
      source: item.UpdatedAt || item.CreatedAt || new Date().toISOString(),
      // Add fields for deduplication
      dataSource,
      regNumber,
      normalizedTitle,
      // Original item ID for debugging
      originalId: item.DocumentId || ''
    };
  });

  // Deduplicate results
  console.log(`Deduplicating ${transformedResults.length} results...`);
  const uniqueDocuments = new Map();
  
  // First pass: Group by normalized title and metadata
  transformedResults.forEach(doc => {
    // Create a deduplication key
    let dedupeKey;
    
    if (doc.regNumber && doc.jurisdiction === 'Colorado') {
      // For Colorado regulations with reg numbers, use jurisdiction + regNumber
      dedupeKey = `${doc.jurisdiction}-regulation-${doc.regNumber}`;
    } else {
      // For other documents, use a normalized version of the title + jurisdiction
      const normalizedTitle = doc.title
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      dedupeKey = `${doc.jurisdiction}-${normalizedTitle}`;
    }
    
    // If we already have this document, decide which to keep
    if (uniqueDocuments.has(dedupeKey)) {
      const existingDoc = uniqueDocuments.get(dedupeKey);
      
      // Prefer kendra-index over colorado-only, but prefer docs with longer descriptions
      // Keep the one with more info, or if they have the same description length, 
      // prefer documents from the main kendra-index
      if (doc.description.length > existingDoc.description.length + 20) {
        // If the new document has a significantly longer description, prefer it
        uniqueDocuments.set(dedupeKey, doc);
        console.log(`Replacing document "${existingDoc.title}" with better version from ${doc.dataSource}`);
      } else if (doc.dataSource === 'kendra-index' && existingDoc.dataSource !== 'kendra-index' && 
                doc.description.length >= existingDoc.description.length - 20) {
        // If the new document is from kendra-index and has a comparable description, prefer it
        uniqueDocuments.set(dedupeKey, doc);
        console.log(`Replacing document "${existingDoc.title}" with preferred source ${doc.dataSource}`);
      }
      // Otherwise keep the existing one
    } else {
      // No duplicate yet, just add it
      uniqueDocuments.set(dedupeKey, doc);
    }
  });
  
  // Convert Map back to array and remove deduplication fields
  const dedupedResults = Array.from(uniqueDocuments.values()).map(doc => {
    // Remove internal fields used for deduplication
    const { dataSource, regNumber, normalizedTitle, originalId, ...cleanDoc } = doc;
    return cleanDoc;
  });
  
  console.log(`Deduplication complete. Reduced from ${transformedResults.length} to ${dedupedResults.length} results`);
  return dedupedResults;
};

/**
 * Helper function to normalize jurisdiction names, fixing typos and ensuring consistency
 * @param {string} value - The jurisdiction value to normalize
 * @returns {string} - The normalized jurisdiction value
 */
const normalizeJurisdiction = (value) => {
  if (!value) return 'Unknown';
  
  // Fix common typos
  if (value === 'Kentuvky') return 'Kentucky';
  
  // Special handling for Albuquerque documents
  // The value could be "New Mexico" but the document is from Albuquerque
  // We'll handle this more specifically in getJurisdictionFromResponse
  
  return value;
};

/**
 * Helper function to extract jurisdiction from Lambda response
 */
function getJurisdictionFromResponse(item) {
  const title = item.DocumentTitle || '';
  const uri = item.SourceUri || '';
  const documentId = item.DocumentId || '';
  
  // Special case for New Mexico-Albuquerque
  // Check for Albuquerque in document ID or title first
  if (documentId.includes('New_Mexico-Albuquerque') || 
      documentId.includes('New Mexico-Albuquerque') ||
      title.startsWith('New Mexico-Albuquerque')) {
    return 'New_Mexico-Albuquerque';
  }
  
  // First check DocumentAttributes for jurisdiction
  if (Array.isArray(item.DocumentAttributes)) {
    const jurisdictionAttr = item.DocumentAttributes.find(
      attr => attr.Key === 'jurisdiction' || attr.Key === 'jurisdiction_name'
    );
    if (jurisdictionAttr?.Value?.StringValue) {
      // Always convert spaces to underscores for consistency in UI
      const jurisdictionValue = jurisdictionAttr.Value.StringValue;
      return normalizeJurisdiction(jurisdictionValue).replace(/ /g, '_');
    }
  }
  
  // FIRST PRIORITY: Check for California air districts - these take precedence 
  // Many California districts have their name in the document title with pattern:
  // [District Name] - [Section]: [Title] - [SubSection]: [Details]
  if (title.includes(' - ')) {
    const districtPart = title.split(' - ')[0].trim();
    
    // Check for California air districts in the title
    const californiaAirDistricts = [
      'Amador APCD',
      'Antelope Valley AQMD',
      'Bay Area AQMD',
      'Butte County AQMD',
      'Calaveras County APCD',
      'Colusa County APCD',
      'Eastern Kern APCD',
      'El Dorado County AQMD',
      'Feather River AQMD',
      'Glenn County APCD',
      'Great Basin Unified APCD',
      'Imperial County APCD',
      'Lake County AQMD',
      'Lassen County APCD',
      'Mariposa County APCD',
      'Mendocino County AQMD',
      'Modoc County APCD',
      'Mojave Desert AQMD',
      'Monterey Bay Unified APCD',
      'North Coast Unified AQMD',
      'Northern Sierra AQMD',
      'Northern Sonoma County APCD',
      'Placer County APCD',
      'Sacramento Metropolitan AQMD',
      'San Diego County APCD',
      'San Joaquin Valley APCD',
      'San Luis Obispo County APCD',
      'Santa Barbara County APCD',
      'Shasta County AQMD',
      'Siskiyou County APCD',
      'South Coast AQMD',
      'Tehama County APCD',
      'Tuolumne County APCD',
      'Ventura County AQMD',
      'Yolo-Solano AQMD'
    ];
    
    // Check if the district part is a known California air district
    for (const district of californiaAirDistricts) {
      if (districtPart === district) {
        return district.replace(/ /g, '_'); // Convert spaces to underscores for UI
      }
    }
  }
  
  // Also check the DocumentId path - many documents have the jurisdiction in the S3 path
  if (documentId.includes('s3://')) {
    // First check specifically for California air districts
    if (documentId.includes('/California/')) {
      const parts = documentId.split('/');
      const californiaIndex = parts.findIndex(part => part === 'California');
      
      if (californiaIndex >= 0 && californiaIndex + 1 < parts.length) {
        const districtPart = parts[californiaIndex + 1];
        // Check if this is an air district path
        if (districtPart && (districtPart.includes('APCD') || districtPart.includes('AQMD'))) {
          // Convert the S3 path format to our internal format
          const cleanedDistrict = districtPart.replace(/%20/g, '_').replace(/ /g, '_');
          return cleanedDistrict;
        }
      }
    }
    
    // Check for New Mexico-Albuquerque in the S3 path
    if (documentId.includes('/New_Mexico-Albuquerque/')) {
      return 'New_Mexico-Albuquerque';
    }
    
    // Then check for state name in the S3 path
    const parts = documentId.split('/');
    if (parts.length >= 4) {  // should be at least 4 parts: s3://, bucket, "kendra-index", state
      const possibleState = parts[3]; // e.g., "Maryland" or "Kentuvky"
      if (possibleState && !possibleState.includes('_')) {
        // Normalize state name to fix typos like "Kentuvky"
        return normalizeJurisdiction(possibleState);
      }
    }
  }
  
  // Check for specific California APCDs/AQMDs based on title or URL patterns
  if (title.includes('Santa Barbara County APCD') || uri.includes('santabarbara') || uri.includes('sbcapcd')) {
    return 'Santa_Barbara_County_APCD';
  }
  if (title.includes('San Joaquin Valley APCD') || uri.includes('valleyair')) {
    return 'San_Joaquin_Valley_APCD';
  }
  if (title.includes('South Coast AQMD') || 
      title.includes('SCAQMD') || 
      uri.includes('aqmd.gov') || 
      documentId.includes('South_Coast_AQMD') || 
      documentId.includes('SCAQMD') ||
      documentId.toLowerCase().includes('south coast')) {
    return 'South_Coast_AQMD';
  }
  if (title.includes('Bay Area AQMD') || title.includes('BAAQMD') || uri.includes('baaqmd')) {
    return 'Bay_Area_AQMD';
  }
  if (title.includes('Tehama County APCD')) {
    return 'Tehama_County_APCD';
  }
  if (title.includes('Great Basin Unified APCD')) {
    return 'Great_Basin_Unified_APCD';
  }
  if (title.includes('Shasta County AQMD')) {
    return 'Shasta_County_AQMD';
  }
  if (title.includes('Colusa County APCD')) {
    return 'Colusa_County_APCD';
  }
  if (title.includes('Eastern Kern APCD')) {
    return 'Eastern_Kern_APCD';
  }

  // Check for general patterns that might indicate California air districts
  const airDistrictPatterns = [
    /APCD|Air Pollution Control District/i,
    /AQMD|Air Quality Management District/i
  ];
  
  for (const pattern of airDistrictPatterns) {
    if (pattern.test(title) || pattern.test(documentId)) {
      // If it contains a California district pattern, but we don't know which one
      // Return California as the jurisdiction
      return 'California';
    }
  }

  // Extract state name from document title for state regulations
  // Format is often: "State - XX.XX.XX - Law Name"
  if (title.includes(' - ')) {
    const statePart = title.split(' - ')[0].trim();
    
    // Check if the first part is a known US state name
    const states = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 
      'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 
      'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
      'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 
      'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 
      'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 
      'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
      'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 
      'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ];
    
    // Apply normalization to fix typos like "Kentuvky"
    const normalizedStatePart = normalizeJurisdiction(statePart);
    if (states.includes(normalizedStatePart)) {
      return normalizedStatePart.replace(/ /g, '_');
    }
  }
  
  // Update statePatterns to include New Mexico-Albuquerque as a separate jurisdiction
  const statePatterns = [
    { name: 'Alabama', pattern: /Alabama|\/AL\/|\.al\.gov/ },
    { name: 'Alaska', pattern: /Alaska|\/AK\/|\.ak\.gov/ },
    { name: 'Arizona', pattern: /Arizona|\/AZ\/|\.az\.gov/ },
    { name: 'Arkansas', pattern: /Arkansas|\/AR\/|\.ar\.gov/ },
    { name: 'California', pattern: /California|\/CA\/|\.ca\.gov/ },
    { name: 'Colorado', pattern: /Colorado|\/CO\/|\.co\.gov/ },
    { name: 'Connecticut', pattern: /Connecticut|\/CT\/|\.ct\.gov/ },
    { name: 'Delaware', pattern: /Delaware|\/DE\/|\.de\.gov/ },
    { name: 'Florida', pattern: /Florida|\/FL\/|\.fl\.gov/ },
    { name: 'Georgia', pattern: /Georgia|\/GA\/|\.ga\.gov/ },
    { name: 'Hawaii', pattern: /Hawaii|\/HI\/|\.hi\.gov/ },
    { name: 'Idaho', pattern: /Idaho|\/ID\/|\.id\.gov/ },
    { name: 'Illinois', pattern: /Illinois|\/IL\/|\.il\.gov/ },
    { name: 'Indiana', pattern: /Indiana|\/IN\/|\.in\.gov/ },
    { name: 'Iowa', pattern: /Iowa|\/IA\/|\.ia\.gov/ },
    { name: 'Kansas', pattern: /Kansas|\/KS\/|\.ks\.gov/ },
    { name: 'Kentucky', pattern: /Kentucky|Kentuvky|\/KY\/|\.ky\.gov/ },
    { name: 'Louisiana', pattern: /Louisiana|\/LA\/|\.la\.gov/ },
    { name: 'Maine', pattern: /Maine|\/ME\/|\.me\.gov/ },
    { name: 'Maryland', pattern: /Maryland|\/MD\/|\.md\.gov/ },
    { name: 'Massachusetts', pattern: /Massachusetts|\/MA\/|\.ma\.gov/ },
    { name: 'Michigan', pattern: /Michigan|\/MI\/|\.mi\.gov/ },
    { name: 'Minnesota', pattern: /Minnesota|\/MN\/|\.mn\.gov/ },
    { name: 'Mississippi', pattern: /Mississippi|\/MS\/|\.ms\.gov/ },
    { name: 'Missouri', pattern: /Missouri|\/MO\/|\.mo\.gov/ },
    { name: 'Montana', pattern: /Montana|\/MT\/|\.mt\.gov/ },
    { name: 'Nebraska', pattern: /Nebraska|\/NE\/|\.ne\.gov/ },
    { name: 'Nevada', pattern: /Nevada|\/NV\/|\.nv\.gov/ },
    { name: 'New Hampshire', pattern: /New_Hampshire|New Hampshire|\/NH\/|\.nh\.gov/ },
    { name: 'New Jersey', pattern: /New_Jersey|New Jersey|\/NJ\/|\.nj\.gov/ },
    { name: 'New Mexico-Albuquerque', pattern: /New_Mexico-Albuquerque|New Mexico-Albuquerque|Albuquerque,? NM|Albuquerque,? New Mexico/ },
    { name: 'New Mexico', pattern: /New_Mexico|New Mexico|\/NM\/|\.nm\.gov/ },
    { name: 'New York', pattern: /New_York|New York|\/NY\/|\.ny\.gov/ },
    { name: 'North Carolina', pattern: /North_Carolina|North Carolina|\/NC\/|\.nc\.gov/ },
    { name: 'North Dakota', pattern: /North_Dakota|North Dakota|\/ND\/|\.nd\.gov/ },
    { name: 'Ohio', pattern: /Ohio|\/OH\/|\.oh\.gov/ },
    { name: 'Oklahoma', pattern: /Oklahoma|\/OK\/|\.ok\.gov/ },
    { name: 'Oregon', pattern: /Oregon|\/OR\/|\.or\.gov/ },
    { name: 'Pennsylvania', pattern: /Pennsylvania|\/PA\/|\.pa\.gov/ },
    { name: 'Rhode Island', pattern: /Rhode_Island|Rhode Island|\/RI\/|\.ri\.gov/ },
    { name: 'South Carolina', pattern: /South_Carolina|South Carolina|\/SC\/|\.sc\.gov/ },
    { name: 'South Dakota', pattern: /South_Dakota|South Dakota|\/SD\/|\.sd\.gov/ },
    { name: 'Tennessee', pattern: /Tennessee|\/TN\/|\.tn\.gov/ },
    { name: 'Texas', pattern: /Texas|\/TX\/|\.tx\.gov/ },
    { name: 'Utah', pattern: /Utah|\/UT\/|\.ut\.gov/ },
    { name: 'Vermont', pattern: /Vermont|\/VT\/|\.vt\.gov/ },
    { name: 'Virginia', pattern: /Virginia|\/VA\/|\.va\.gov/ },
    { name: 'Washington', pattern: /Washington|\/WA\/|\.wa\.gov/ },
    { name: 'West Virginia', pattern: /West_Virginia|West Virginia|\/WV\/|\.wv\.gov/ },
    { name: 'Wisconsin', pattern: /Wisconsin|\/WI\/|\.wi\.gov/ },
    { name: 'Wyoming', pattern: /Wyoming|\/WY\/|\.wy\.gov/ }
  ];

  // Combine all metadata for checking
  const allText = [title, documentId, uri].join(' ');
  
  for (const state of statePatterns) {
    if (state.pattern.test(allText)) {
      return state.name.replace(/ /g, '_');
    }
  }

  // If still no match, return Unknown
  return 'Unknown';
}

// Add a debug function to help diagnose jurisdiction extraction
function isLikelySouthCoastAQMD(item) {
  const title = item.DocumentTitle || '';
  const uri = item.SourceUri || '';
  const documentId = item.DocumentId || '';
  
  // Log detailed info about a document that might be from South Coast AQMD
  const checks = {
    titleHasSouthCoastAQMD: title.includes('South Coast AQMD'),
    titleHasSCAQMD: title.includes('SCAQMD'),
    uriHasAQMDdotGov: uri.includes('aqmd.gov'),
    documentIdHasSouthCoastAQMD: documentId.includes('South_Coast_AQMD'),
    documentIdHasSCAQMD: documentId.includes('SCAQMD'),
    documentIdLowerHasSouthCoast: documentId.toLowerCase().includes('south coast')
  };
  
  const isLikely = Object.values(checks).some(v => v === true);
  
  if (isLikely) {
    console.log('Found likely South Coast AQMD document:', { title, documentId, uri });
    console.log('Check results:', checks);
  }
  
  return isLikely;
}

/**
 * Fetch comprehensive jurisdiction counts from a dedicated Lambda endpoint
 * @param {string} query - Raw search query exactly as entered by the user (no wildcards or trimming)
 * @param {Object|Array} [attributeFilter] - Optional jurisdiction filters in AttributeFilter format
 * @returns {Promise<Object>} - Object with jurisdiction counts
 */
export const fetchFacetCounts = async (query = '', attributeFilter = null) => {
  try {
    // Don't trim the query - pass it exactly as provided by the user
    // Only check if it's completely empty
    if (!query) {
      console.log('Skipping facet counts request for empty query');
      return {};
    }
    
    // Create request body with the exact raw query (no wildcards, no trimming)
    const requestBody = {
      query: query,
      facets: [
        { documentAttributeKey: 'jurisdiction' },
        { documentAttributeKey: 'aq_type' }
      ]
    };

    // Add attribute filter if provided
    if (attributeFilter) {
      requestBody.attributeFilter = attributeFilter;
      console.log('Adding jurisdiction filters to facet counts request:', 
                 JSON.stringify(attributeFilter, null, 2));
    }
    
    console.log('Fetching jurisdiction counts with payload:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(FACET_COUNTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Facet counts API error:', errorText);
      throw new Error(`Error fetching facet counts: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The response has a body field that contains stringified JSON
    if (data.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        console.log(`Received counts for ${Object.keys(parsedBody.jurisdictionCounts || {}).length} jurisdictions`);
        return parsedBody.jurisdictionCounts || {};
      } catch (parseError) {
        console.error('Error parsing facet counts response body:', parseError);
        return {};
      }
    } else {
      console.log('Received facet counts:', data);
      return data.jurisdictionCounts || {};
    }
  } catch (error) {
    console.error('Error fetching facet counts:', error.message);
    return {};
  }
}; 