export interface PredictionResponse {
  filename: string;
  predicted_class: string;
  confidence: number;
  probabilities: {
    "Abnormal(Ulcer)": number;
    "Normal(Healthy skin)": number;
  };
}
