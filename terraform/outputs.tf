output "cluster_name" {
  description = "EKS Cluster identifier"
  value       = aws_eks_cluster.cartiva.name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane API"
  value       = aws_eks_cluster.cartiva.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.cartiva.certificate_authority[0].data
  sensitive   = true
}

output "ecr_backend_url" {
  description = "ECR Repository URL for Backend Docker image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR Repository URL for Frontend Docker image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "kubeconfig_command" {
  description = "Command to configure local kubectl context"
  value       = "aws eks --region ${var.aws_region} update-kubeconfig --name ${aws_eks_cluster.cartiva.name}"
}

