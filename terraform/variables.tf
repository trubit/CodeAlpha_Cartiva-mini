variable "project_name" {
  description = "Project identifier for resource naming and tagging"
  type        = string
  default     = "cartiva-mini"
}

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for cluster and networking infrastructure"
  type        = string
  default     = "eu-west-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "cluster_name" {
  description = "Kubernetes EKS cluster name"
  type        = string
  default     = "cartiva-mini-prod"
}

variable "kubernetes_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.29"
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS worker node group"
  type        = list(string)
  default     = ["t3.medium", "t3a.medium"]
}

variable "min_nodes" {
  description = "Minimum number of worker nodes in autoscaling group"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum number of worker nodes in autoscaling group"
  type        = number
  default     = 6
}

variable "desired_nodes" {
  description = "Desired number of worker nodes initially provisioned"
  type        = number
  default     = 3
}

