import * as ad from "./activedirectory";
import * as resources from "@pulumi/azure-native/resources";
import * as cluster from "./cluster";
import * as network from "./network";

const adApplication = new ad.ActiveDirectoryApplication("demo-ad-application");

const rg = new resources.ResourceGroup("demo-resourcegroup");

// If the IP ranges below don't work, you can switch them for ones that do
const net = new network.Network("demo-network", {
    networkCidr: "10.2.0.0/16",
    subnetCidr: "10.2.1.0/24",
    resourceGroupName: rg.name
})

export const k8scluster = new cluster.KubernetesCluster("demo-cluster", {
    aDAdminGroupObjectId: adApplication.GroupObjectId,
    aDApplicationId: adApplication.ApplicationId,
    aDApplicationSecret: adApplication.ApplicationSecret,
    resourceGroupName: rg.name,
    subnetId: net.subnetId
})
