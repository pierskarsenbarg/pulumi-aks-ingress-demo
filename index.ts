import * as k8s from "@pulumi/kubernetes";
import * as cluster from "./setup"
import { NginxIngress } from "./helm-nginx-ingress";

export const config = cluster.k8scluster.Kubeconfig;

const provider = new k8s.Provider("demo-provider", {
    kubeconfig: cluster.k8scluster.Kubeconfig
}, { dependsOn: cluster.k8scluster });

const namespace = new k8s.core.v1.Namespace("demo-apps-namespace", {
    metadata: {
        name: "apps"
    }
}, { provider });

const ingress = new NginxIngress("demo", {
    provider,
    version: "3.31.0",
    replicas: 1
});



const appName = "kuard";

const appLabel = { app: appName };

const containerPort = 8080;

const deployment = new k8s.apps.v1.Deployment(`demo-${appName}-deployment`, {
    metadata: {
        namespace: namespace.metadata.name,
        name: `${appName}-deployment`
    },
    spec: {
        selector: { matchLabels: appLabel },
        replicas: 1,
        template: {
            metadata: { labels: appLabel },
            spec: {
                containers: [{
                    image: "gcr.io/kuar-demo/kuard-amd64:blue",
                    ports: [{
                        containerPort: containerPort,
                        name: "http-port"
                    }],
                    name: appName
                }]
            }
        }
    }
}, { provider });

const service = new k8s.core.v1.Service(`demo-${appName}-service`, {
    metadata: {
        name: `${appName}-service`,
        namespace: namespace.metadata.name
    },
    spec: {
        selector: appLabel,
        ports: [{ port: 80, targetPort: containerPort, name: "http-port" }]
    }
}, { provider, dependsOn: deployment })


const hostname = "kuard.karsenbarg.net"; // This is the hostname that you'll need to point at the IP you get from the IP output when you run this code

const kuardIngress = new k8s.networking.v1.Ingress(`${appName}-ingress`, {
    metadata: {
        namespace: namespace.metadata.name,
        name: `${appName}-ingress`,
        annotations: {
            "kubernetes.io/ingress.class": "nginx",
            "nginx.ingress.kubernetes.io/ssl-redirect": "false"
        }
    },
    spec: {
        rules: [{
            host: hostname,
            http: {
                paths: [{
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                        service: {
                            name: service.metadata.name,
                            port: {
                                name: "http-port"
                            }
                        }
                    }
                }]
            }
        }]
    }
}, { provider })

export const ip = ingress.IngressServiceIp;