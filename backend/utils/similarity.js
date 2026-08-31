const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of',
  'with','by','from','as','is','was','are','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'may','might','shall','can','it','its','this','that','these','those',
  'i','me','my','we','our','you','your','he','him','his','she','her',
  'they','them','their','what','which','who','when','where','why','how',
  'all','each','every','both','some','no','not','only','so','than',
  'too','very','just','also','about','after','again','before','between',
  'during','into','over','then','there','through','until','while','up',
  'if','any','out','off','down','even','here','such','other','more',
  'most','any','each','few','same'
]);

const stemWord = (w) => {
  w = w.toLowerCase().replace(/[^\w]/g, '');
  if (w.length <= 4) return w;
  const suffixes = ['ing','tion','tions','ness','ment','ments','ible','able','ibly','ably','ful','ous','ive','ize','ise','ized','ised','er','ed','ly','es','s'];
  for (const s of suffixes) {
    if (w.endsWith(s) && (w.length - s.length) >= 3) {
      return w.substring(0, w.length - s.length);
    }
  }
  return w;
};

const tokenizeSentences = (text) => {
  if (!text) return [];
  // Split on . or ! or ? followed by whitespace
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map(s => s.trim()).filter(s => s.length > 0);
};

const getCosineSimilarity = (c1, c2) => {
  const tokens1 = c1.split(/\s+/).filter(t => t.length > 0);
  const tokens2 = c2.split(/\s+/).filter(t => t.length > 0);
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const freq1 = {};
  const freq2 = {};
  const vocab = new Set();

  tokens1.forEach(t => { freq1[t] = (freq1[t] || 0) + 1; vocab.add(t); });
  tokens2.forEach(t => { freq2[t] = (freq2[t] || 0) + 1; vocab.add(t); });

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  vocab.forEach(t => {
    const v1 = freq1[t] || 0;
    const v2 = freq2[t] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  });

  if (norm1 === 0 || norm2 === 0) return 0.0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

const getLcsLength = (str1, str2) => {
  const m = str1.length;
  const n = str2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
};

const getSequenceRatio = (s1, s2) => {
  const lcs = getLcsLength(s1, s2);
  const totalLen = s1.length + s2.length;
  if (totalLen === 0) return 0.0;
  return (lcs * 2) / totalLen;
};

const getSentenceSimilarity = (s1, s2) => {
  const c1 = s1.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const c2 = s2.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (!c1 || !c2) return 0.0;

  const words1 = c1.split(/\s+/).filter(t => t.length > 0);
  const words2 = c2.split(/\s+/).filter(t => t.length > 0);
  if (words1.length === 0 || words2.length === 0) return 0.0;

  // Jaccard Overlap
  const wSet1 = new Set(words1);
  const wSet2 = new Set(words2);
  const intersection = new Set([...wSet1].filter(x => wSet2.has(x)));
  const union = new Set([...wSet1, ...wSet2]);
  const jaccard = intersection.size / union.size;

  // Fast Jaccard pre-filter
  if (jaccard < 0.15) {
    return jaccard;
  }

  // Cosine Similarity
  const cosine = getCosineSimilarity(c1, c2);

  // Sequence matching ratio (LCS-based)
  const seqRatio = getSequenceRatio(c1, c2);

  return Math.max(jaccard, cosine, seqRatio);
};

module.exports = {
  tokenizeSentences,
  getSentenceSimilarity
};
