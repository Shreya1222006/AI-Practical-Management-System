import pandas as pd
from sklearn.linear_model import LinearRegression

df = pd.read_csv('study_scores.csv')
X = df[['study_hours']]
y = df['score']
model = LinearRegression().fit(X, y)
prediction = model.predict(pd.DataFrame({'study_hours': [5.5]}))[0]
mae = (abs(model.predict(X) - y)).mean()

assert len(df) == 8
assert abs(model.coef_[0] - 2.0) < 1e-8
assert abs(model.intercept_ - 1.0) < 1e-8
assert abs(prediction - 12.0) < 1e-8
assert abs(mae) < 1e-8
print(f'rows={len(df)}')
print(f'coef={model.coef_[0]:.2f}')
print(f'intercept={model.intercept_:.2f}')
print(f'prediction_at_5.5={prediction:.2f}')
print(f'training_mae={mae:.2f}')