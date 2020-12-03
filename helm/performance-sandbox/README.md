# Installing
Add Helm repositories:

```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add stable https://charts.helm.sh/stable
helm repo update
```

Install Prometheus:
```
helm install prometheus prometheus-community/prometheus
```

Install the Prometheus Adapter for custom metrics:
```
helm install prometheus-adapter prometheus-community/prometheus-adapter
```
