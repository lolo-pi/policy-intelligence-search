/**
 * Kendra Search API utilities
 */

const API_ENDPOINT = 'https://gbgi989gbe.execute-api.us-west-2.amazonaws.com/sbx/search';
const INDEX_ID = 'ac2e614a-1a60-4788-921f-439355c5756d';

/**
 * Search Kendra with optional jurisdiction filter and document type filter
 * @param {string} query - Search query
 * @param {string} [jurisdiction] - Optional jurisdiction to filter by
 * @param {string} [documentType] - Optional document type (_category) to filter by
 * @param {boolean} [fetchFacets] - Whether to fetch facet counts instead of search results
 * @returns {Promise<Object>} - Search results or facet counts
 */
export const searchKendra = async (query = '', jurisdiction = null, documentType = null, fetchFacets = false) => {
  try {
    // Trim inputs but preserve the leading space in " Source Report"
    const trimmedQuery = query?.trim() || '';
    const trimmedJurisdiction = jurisdiction?.trim() || null;
    
    // Special handling for document type - don't trim " Source Report"
    let processedDocType = null;
    if (documentType === " Source Report") {
      // Keep the leading space for Source Report
      processedDocType = " Source Report";
      console.log("Preserving leading space in Source Report filter");
    } else {
      // For other document types, trim as usual
      processedDocType = documentType?.trim() || null;
    }
    
    // Match the exact format the Lambda function expects based on the Lambda code
    const requestBody = {
      QueryText: trimmedQuery ? `*${trimmedQuery}*` : '*', // Add wildcards for partial matches
      IndexId: INDEX_ID
    };

    // If we're fetching facets, add a flag for the lambda
    if (fetchFacets) {
      requestBody.facetSummary = true;
      console.log("Requesting facet summary for document counts");
      
      // Add document type filter to facet requests if specified
      if (processedDocType) {
        requestBody._category = processedDocType;
        console.log(`Adding document type filter to facet request: "${processedDocType}"`);
      }
    } else {
      // Add jurisdiction filter if specified - match the Lambda's expected format
      if (trimmedJurisdiction) {
        requestBody.jurisdiction = trimmedJurisdiction;
        console.log(`Adding jurisdiction filter: "${trimmedJurisdiction}"`);
      }

      // Add document type filter if specified - Lambda expects _category parameter
      if (processedDocType) {
        // The Lambda uses _category for document type filtering
        requestBody._category = processedDocType;
        console.log(`Adding document type filter (_category): "${processedDocType}"`);
      }
    }

    // Log request for debugging
    console.log('Making Kendra request with body:', JSON.stringify(requestBody, null, 2));

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
      throw new Error(`Error from Kendra API: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Log the raw response for debugging
    console.log('Raw Kendra response:', JSON.stringify(data, null, 2).substring(0, 1000) + '...');
    
    // If we requested facets, return them
    if (fetchFacets) {
      console.log("Received facet data:", JSON.stringify(data, null, 2));
      // Transform facets into a more usable format
      const docTypeCounts = {};
      const jurisdictionCounts = {};
      
      // Jurisdiction mapping from API values to UI values
      const jurisdictionMapping = {
        'New Mexico': 'New_Mexico',
        'South Coast AQMD': 'South_Coast_AQMD',
        'Bay Area AQMD': 'Bay_Area_AQMD',
        'Sacramento AQMD': 'Sacramento_AQMD',
        // Add direct mappings for non-spaced jurisdictions
        'Colorado': 'Colorado',
        'Texas': 'Texas',
        'Washington': 'Washington',
        'Arizona': 'Arizona',
        'New York': 'New_York'
      };
      
      // Define our primary jurisdictions (UI values)
      const primaryJurisdictions = [
        'Colorado',
        'Texas',
        'New Mexico',
        'Washington',
        'South Coast AQMD',
        'Bay Area AQMD',
        'Arizona',
        'New York',
        'Sacramento AQMD'
      ];
      
      // Check if facets are in an expected format
      if (Array.isArray(data)) {
        data.forEach(facet => {
          // Process document type counts
          if (facet.DocumentAttributeKey === '_category' && 
              Array.isArray(facet.DocumentAttributeValueCountPairs)) {
            facet.DocumentAttributeValueCountPairs.forEach(pair => {
              if (pair.DocumentAttributeValue && pair.DocumentAttributeValue.StringValue) {
                docTypeCounts[pair.DocumentAttributeValue.StringValue] = pair.Count;
              }
            });
            console.log("Document type counts:", docTypeCounts);
          } 
          // Process jurisdiction counts
          else if (facet.DocumentAttributeKey === 'jurisdiction' && 
                   Array.isArray(facet.DocumentAttributeValueCountPairs)) {
            // Log the raw values for debugging
            console.log("Raw jurisdiction values:", 
              facet.DocumentAttributeValueCountPairs.map(p => ({
                name: p.DocumentAttributeValue?.StringValue,
                count: p.Count
              }))
            );
            
            // Map API jurisdiction values to UI jurisdiction values
            facet.DocumentAttributeValueCountPairs.forEach(pair => {
              if (pair.DocumentAttributeValue && 
                  pair.DocumentAttributeValue.StringValue) {
                const apiJurisdiction = pair.DocumentAttributeValue.StringValue;
                const count = pair.Count;
                
                // Map the API jurisdiction value to our UI label
                const uiJurisdiction = jurisdictionMapping[apiJurisdiction] || apiJurisdiction;
                
                // If already have a count for this jurisdiction, add to it
                jurisdictionCounts[uiJurisdiction] = (jurisdictionCounts[uiJurisdiction] || 0) + count;
              }
            });
            
            // Log the final jurisdiction counts
            console.log("Processed jurisdiction counts:", jurisdictionCounts);
            
            // Set zero counts for jurisdictions with no results instead of warning
            primaryJurisdictions.forEach(jurisdiction => {
              if (!jurisdictionCounts[jurisdiction]) {
                jurisdictionCounts[jurisdiction] = 0;
              }
              console.log(`${jurisdiction}: ${jurisdictionCounts[jurisdiction]}`);
            });
          }
        });
      }
      
      return { 
        facets: {
          documentTypes: docTypeCounts,
          jurisdictions: jurisdictionCounts
        }
      };
    }
    
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
    
    console.log(`Received ${resultsArray.length} results${trimmedJurisdiction ? ' for ' + trimmedJurisdiction : ''}${processedDocType ? ' with document type "' + processedDocType + '"' : ''}, Total available: ${totalAvailable}`);
    
    return {
      results: resultsArray,
      totalAvailable: totalAvailable
    };
  } catch (error) {
    console.error('Error searching Kendra:', error.message);
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
 * Extract an S3 path from a Kendra result item
 * @param {Object} item - The Kendra result item
 * @returns {String} - The S3 path if found, or an empty string
 */
export const extractS3Path = (item) => {
  if (!item) return '';
  
  // Check DocumentAttributes for S3 path
  if (Array.isArray(item.DocumentAttributes)) {
    // Check for S3 path in _source_uri attribute
    const sourceUriAttr = item.DocumentAttributes.find(attr => attr.Key === '_source_uri');
    if (sourceUriAttr?.Value?.StringValue && sourceUriAttr.Value.StringValue.startsWith('s3://')) {
      return sourceUriAttr.Value.StringValue;
    }
    
    // Check for S3 path in a specific s3_path attribute
    const s3PathAttr = item.DocumentAttributes.find(attr => 
      attr.Key === 's3_path' || attr.Key === 'S3Path' || attr.Key === 's3_uri'
    );
    if (s3PathAttr?.Value?.StringValue && s3PathAttr.Value.StringValue.startsWith('s3://')) {
      return s3PathAttr.Value.StringValue;
    }
  }
  
  // Check various fields that might contain an S3 path
  if (item.S3Path && item.S3Path.startsWith('s3://')) {
    return item.S3Path;
  }
  
  if (item.DocumentURI && item.DocumentURI.startsWith('s3://')) {
    return item.DocumentURI;
  }
  
  if (item.SourceURI && item.SourceURI.startsWith('s3://')) {
    return item.SourceURI;
  }
  
  if (item.DocumentId && item.DocumentId.startsWith('s3://')) {
    return item.DocumentId;
  }
  
  // If we didn't find an S3 path, return empty string
  return '';
};

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
  
  return resultItems.map((item, index) => {
    // For debugging, log every 5th item to avoid console flood
    const shouldLog = index % 5 === 0 || index === 0;
    if (shouldLog) {
      console.log(`\nProcessing document ${index}: ${item.DocumentTitle || 'Untitled'}`);
    }
    
    // Extract document type if available - check all possible locations
    let documentType = null;
    let typeSource = 'unknown';
    
    // Check for DocumentAttributes array - prioritize _category as that's what the Lambda uses
    if (Array.isArray(item.DocumentAttributes)) {
      // First look specifically for _category
      const categoryAttr = item.DocumentAttributes.find(attr => attr.Key === '_category');
      if (categoryAttr && categoryAttr.Value && categoryAttr.Value.StringValue) {
        documentType = categoryAttr.Value.StringValue;
        typeSource = '_category attribute';
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
    
    // Extract S3 path
    const s3Path = extractS3Path(item);
    if (shouldLog && s3Path) {
      console.log(`Found S3 path: ${s3Path}`);
    }
    
    // Create and return the standardized document object
    return {
      id: item.Id || item.DocumentId || `doc-${Math.random().toString(36).substring(2, 15)}`,
      title: item.DocumentTitle || item.Title || 'Untitled Document',
      url: documentUrl || item.SourceUri || '',  // Ensure SourceUri is used for URL
      description: description,
      type: documentType,
      jurisdiction: getJurisdictionFromResponse(item), // Add jurisdiction field
      source: item.UpdatedAt || item.CreatedAt || new Date().toISOString(),
      s3Path: s3Path // Add S3 path to the document object
    };
  });
};

/**
 * Helper function to extract jurisdiction from Lambda response
 */
function getJurisdictionFromResponse(item) {
  // First check DocumentAttributes for jurisdiction
  if (Array.isArray(item.DocumentAttributes)) {
    const jurisdictionAttr = item.DocumentAttributes.find(
      attr => attr.Key === 'jurisdiction' || attr.Key === 'jurisdiction_name'
    );
    if (jurisdictionAttr?.Value?.StringValue) {
      return jurisdictionAttr.Value.StringValue;
    }
  }

  const title = item.DocumentTitle || '';
  const uri = item.SourceUri || '';
  
  // Check for California APCDs/AQMDs first
  if (title.includes('Santa Barbara County APCD') || uri.includes('santabarbara') || uri.includes('sbcapcd')) {
    return 'Santa Barbara County APCD';
  }
  if (title.includes('San Joaquin Valley APCD') || uri.includes('valleyair')) {
    return 'San Joaquin Valley APCD';
  }
  if (title.includes('South Coast AQMD') || title.includes('SCAQMD') || uri.includes('aqmd.gov')) {
    return 'South Coast AQMD';
  }
  if (title.includes('Bay Area AQMD') || title.includes('BAAQMD') || uri.includes('baaqmd')) {
    return 'Bay Area AQMD';
  }

  // Check for state jurisdictions
  if (title.startsWith('Kentucky') || uri.includes('kentucky.gov') || uri.includes('/ky/')) {
    return 'Kentucky';
  }
  if (title.startsWith('Colorado') || uri.includes('colorado.gov') || uri.includes('/co/')) {
    return 'Colorado';
  }
  if (title.startsWith('Texas') || uri.includes('texas.gov') || uri.includes('/tx/')) {
    return 'Texas';
  }
  if (title.startsWith('New Mexico') || uri.includes('newmexico.gov') || uri.includes('/nm/')) {
    return 'New Mexico';
  }
  if (title.startsWith('Washington') || uri.includes('washington.gov') || uri.includes('/wa/')) {
    return 'Washington';
  }

  // Check for state codes in the title
  if (title.includes(' - ')) {
    const stateCode = title.split(' - ')[0].trim();
    const stateMapping = {
      'KY': 'Kentucky',
      'CO': 'Colorado',
      'TX': 'Texas',
      'NM': 'New Mexico',
      'WA': 'Washington'
    };
    if (stateMapping[stateCode]) {
      return stateMapping[stateCode];
    }
  }

  // If no clear jurisdiction is found, check the content
  const content = [title, uri, item.ExcerptText || ''].join(' ').toLowerCase();
  if (content.includes('kentucky')) return 'Kentucky';
  if (content.includes('colorado')) return 'Colorado';
  if (content.includes('texas')) return 'Texas';
  if (content.includes('new mexico')) return 'New Mexico';
  if (content.includes('washington')) return 'Washington';

  // If still no match, return Unknown instead of defaulting to Colorado
  return 'Unknown';
} 