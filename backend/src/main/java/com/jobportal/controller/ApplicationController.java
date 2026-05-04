package com.jobportal.controller;

import com.jobportal.model.ApplicationStatus;
import com.jobportal.model.Job;
import com.jobportal.model.JobApplication;
import com.jobportal.model.User;
import com.jobportal.repository.ApplicationRepository;
import com.jobportal.repository.JobRepository;
import com.jobportal.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    @Autowired
    ApplicationRepository applicationRepository;

    @Autowired
    JobRepository jobRepository;

    @Autowired
    UserRepository userRepository;

    @PostMapping("/apply/{jobId}")
    @PreAuthorize("hasRole('SEEKER')")
    public ResponseEntity<?> applyForJob(@PathVariable Long jobId, @RequestBody(required = false) String resumeUrl) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User applicant = userRepository.findByUsername(username).orElse(null);
        Job job = jobRepository.findById(jobId).orElse(null);

        if (applicant == null || job == null) {
            return ResponseEntity.badRequest().body("User or Job not found");
        }

        Optional<JobApplication> existingApp = applicationRepository.findByJobIdAndApplicantId(jobId, applicant.getId());
        if (existingApp.isPresent()) {
            return ResponseEntity.badRequest().body("Already applied for this job");
        }

        JobApplication application = new JobApplication();
        application.setJob(job);
        application.setApplicant(applicant);
        application.setResumeUrl(resumeUrl);

        applicationRepository.save(application);
        return ResponseEntity.ok("Successfully applied for the job!");
    }

    @GetMapping("/my-applications")
    @PreAuthorize("hasRole('SEEKER')")
    public List<JobApplication> getMyApplications() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User applicant = userRepository.findByUsername(username).orElseThrow();
        return applicationRepository.findByApplicantId(applicant.getId());
    }

    @GetMapping("/job/{jobId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getJobApplications(@PathVariable Long jobId) {
        return ResponseEntity.ok(applicationRepository.findByJobId(jobId));
    }

    @PutMapping("/{applicationId}/status")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateApplicationStatus(@PathVariable Long applicationId, @RequestParam ApplicationStatus status) {
        Optional<JobApplication> applicationOpt = applicationRepository.findById(applicationId);
        if (applicationOpt.isPresent()) {
            JobApplication application = applicationOpt.get();
            application.setStatus(status);
            applicationRepository.save(application);
            return ResponseEntity.ok("Application status updated successfully");
        }
        return ResponseEntity.notFound().build();
    }
}
