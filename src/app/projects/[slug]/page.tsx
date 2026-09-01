import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  projects,
  getProject,
  getAdjacentProject,
} from "@/data/projects";
import { CaseStudy } from "@/components/CaseStudy";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const project = getProject(params.slug);
  if (!project) return {};

  const title = `${project.title} — ${project.category} case study`;
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      url: `${site.url}/projects/${project.slug}`,
      title,
      description: project.description,
    },
  };
}

export default function ProjectPage({
  params,
}: {
  params: { slug: string };
}) {
  const project = getProject(params.slug);
  if (!project) notFound();

  const next = getAdjacentProject(project.slug);

  return (
    <>
      <CaseStudy project={project} next={next} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: project.title,
            about: project.category,
            description: project.description,
            creator: { "@type": "Organization", name: site.name },
            keywords: project.technologies.join(", "),
          }),
        }}
      />
    </>
  );
}
