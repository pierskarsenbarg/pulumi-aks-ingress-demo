# Demo deploying Kuard behind an Nginx Ingress Controller on AKS

## Prerequisits

You must have the following installed:

- Pulumi
- AZ CLI (and be logged in)
- Nodejs

## Getting started

1. Clone the repo: `git clone https://github.com/pierskarsenbarg/pulumi-aks-ingress-demo.gitirectory`
1. Install node modules: `npm install`
1. Create new stack: `pulumi stack init dev`
1. Choose Azure location to deploy to: `pulumi config set azure-native:location {location}` (I used uksouth for my demo)
1. Deploy: `pulumi up`
1. Destroy once finished: `pulumi destroy`
